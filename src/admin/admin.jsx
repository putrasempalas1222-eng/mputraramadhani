import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ref, onValue, update } from "firebase/database";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { db, auth, googleProvider } from "../firebase";

function hasAdminAccess() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname || "";
  const search = new URLSearchParams(window.location.search);
  return (
    path.includes("page=031104") ||
    path.includes("031104") ||
    search.get("page") === "031104"
  );
}

function AccessDenied() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#08080a",
      color: "#ece7de",
      padding: "24px",
      textAlign: "center"
    }}>
      <div style={{
        maxWidth: "440px",
        background: "rgba(18,18,22,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        padding: "40px 32px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.8)"
      }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔒</div>
        <h2 style={{ fontSize: "22px", margin: "0 0 10px", color: "var(--text)" }}>Akses Terbatas</h2>
        <p style={{ fontSize: "13px", color: "var(--text-dim)", margin: "0 0 24px", lineHeight: 1.6 }}>
          Halaman admin memerlukan parameter akses khusus. Pastikan Anda mengakses melalui rute <code>/admin/page=031104</code>.
        </p>
        <a href="/" style={{
          display: "inline-block",
          padding: "10px 24px",
          background: "rgba(203,168,116,0.15)",
          border: "1px solid rgba(203,168,116,0.35)",
          color: "var(--accent-bright)",
          borderRadius: "999px",
          textDecoration: "none",
          fontSize: "13px",
          fontWeight: 500
        }}>
          Kembali ke Aplikasi Utama
        </a>
      </div>
    </div>
  );
}

const RECOMMENDED_RULES_JSON = `{
  "rules": {
    "users": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        "profile": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid"
        },
        "conversations": {
          ".read": "auth != null && auth.uid === $uid",
          ".indexOn": ["updatedAt", "expiresAt"],
          "$chatId": {
            ".write": "auth != null && auth.uid === $uid",
            ".validate": "newData.hasChildren(['title', 'messages', 'updatedAt', 'expiresAt'])",
            "title": { ".validate": "newData.isString() && newData.val().length <= 100" },
            "updatedAt": { ".validate": "newData.isNumber()" },
            "expiresAt": { ".validate": "newData.isNumber()" }
          }
        }
      }
    },
    "promos": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}`;

function AdminApp() {
  const isAuthorized = hasAdminAccess();
  if (!isAuthorized) {
    return <AccessDenied />;
  }

  const [adminUser, setAdminUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState("");
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [toast, setToast] = useState("");
  const [rulesCopied, setRulesCopied] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Modal edit tanggal expired
  const [editingUser, setEditingUser] = useState(null);
  const [expiryDateInput, setExpiryDateInput] = useState("");

  // Modal pantau chat
  const [inspectUser, setInspectUser] = useState(null);
  const [selectedConvId, setSelectedConvId] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setAdminUser(u);
      setAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    setLoading(true);
    setDbError(null);

    const usersRef = ref(db, "users");
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const list = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnap) => {
            const uid = childSnap.key;
            const val = childSnap.val() || {};
            const profile = val.profile || {};
            const conversations = val.conversations || {};
            list.push({
              uid,
              profile: {
                ...profile,
                uid: profile.uid || uid,
                displayName: profile.displayName || profile.name || "Pengguna",
                email: profile.email || "-",
                plan: profile.plan || "free",
                planName: profile.planName || (profile.plan === "plus" ? "Plus" : "Free"),
                planExpiresAt: profile.planExpiresAt || profile.expiresAt || null,
                status: profile.status || "active",
                createdAt: profile.createdAt || null,
                lastLoginAt: profile.lastLoginAt || null,
              },
              conversations,
              conversationsCount: Object.keys(conversations).length,
            });
          });
        }
        list.sort((a, b) => (b.profile.updatedAt || b.profile.createdAt || 0) - (a.profile.updatedAt || a.profile.createdAt || 0));
        setUsersList(list);
        setLoading(false);
        setDbError(null);

        const syncNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLastSyncTime(syncNow);

        try {
          console.info(
            "%c[VAL-AI BACKEND ADMIN]",
            "background:#1b1915;color:#e0c393;font-weight:bold;padding:4px 8px;border-radius:6px;border:1px solid #cba874",
            {
              databaseNode: "users",
              totalUsers: list.length,
              plusUsers: list.filter((u) => u.profile.plan === "plus").length,
              bannedUsers: list.filter((u) => u.profile.status === "banned").length,
              lastSynced: syncNow,
              usersData: list,
            }
          );
        } catch {}
      },
      (err) => {
        console.warn("[VAL-AI BACKEND ADMIN] Gagal membaca database users:", err);
        setDbError(err?.message || "Izin ditolak atau gagal membaca database users.");
        setLoading(false);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [reloadTrigger, adminUser]);

  const handleLoginGoogle = async () => {
    setLoginLoading(true);
    setLoginError("");
    try {
      await signInWithPopup(auth, googleProvider);
      setShowLoginModal(false);
      showToast("Berhasil login sebagai Admin.");
    } catch (err) {
      setLoginError(err.message || "Gagal login dengan Google.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLoginEmail = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setShowLoginModal(false);
      showToast("Berhasil login sebagai Admin.");
    } catch (err) {
      setLoginError(err.message || "Email atau password salah.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    showToast("Berhasil logout dari akun admin.");
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(RECOMMENDED_RULES_JSON);
    setRulesCopied(true);
    showToast("Rules Firebase berhasil disalin ke clipboard!");
    setTimeout(() => setRulesCopied(false), 3000);
  };

  const formatDateDisplay = (timestamp) => {
    if (!timestamp) return "-";
    try {
      const num = Number(timestamp);
      const d = !Number.isNaN(num) && num > 0 ? new Date(num) : new Date(timestamp);
      if (Number.isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const handleTogglePlan = async (target) => {
    const isPlus = target.profile.plan === "plus";
    const profileRef = ref(db, `users/${target.uid}/profile`);
    try {
      if (isPlus) {
        await update(profileRef, {
          plan: "free",
          planName: "Free",
          planExpiresAt: null,
          updatedAt: Date.now(),
        });
        showToast(`Paket ${target.profile.displayName} berhasil diubah ke Free.`);
      } else {
        const defaultExp = Date.now() + 30 * 24 * 60 * 60 * 1000;
        await update(profileRef, {
          plan: "plus",
          planName: "Plus",
          planActivatedAt: Date.now(),
          planExpiresAt: defaultExp,
          updatedAt: Date.now(),
        });
        showToast(`Paket ${target.profile.displayName} berhasil ditingkatkan ke Plus (+30 hari).`);
      }
    } catch (err) {
      console.error("Gagal mengubah paket:", err);
      showToast(`Gagal: ${err.message}`);
    }
  };

  const handleToggleBan = async (target) => {
    const isBanned = target.profile.status === "banned";
    const newStatus = isBanned ? "active" : "banned";
    const profileRef = ref(db, `users/${target.uid}/profile`);
    try {
      await update(profileRef, {
        status: newStatus,
        updatedAt: Date.now(),
      });
      showToast(
        isBanned
          ? `Akun ${target.profile.displayName} berhasil dibuka (unbanned).`
          : `Akun ${target.profile.displayName} berhasil diblokir (banned).`
      );
    } catch (err) {
      console.error("Gagal mengubah status blokir:", err);
      showToast(`Gagal: ${err.message}`);
    }
  };

  const handleOpenExpiry = (userItem) => {
    setEditingUser(userItem);
    const curr = userItem.profile.planExpiresAt;
    if (curr) {
      try {
        const num = Number(curr);
        const d = !Number.isNaN(num) && num > 0 ? new Date(num) : new Date(curr);
        if (!Number.isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          setExpiryDateInput(`${yyyy}-${mm}-${dd}`);
          return;
        }
      } catch {}
    }
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, "0");
    const dd = String(future.getDate()).padStart(2, "0");
    setExpiryDateInput(`${yyyy}-${mm}-${dd}`);
  };

  const handleSaveExpiry = async () => {
    if (!editingUser || !expiryDateInput) return;
    try {
      const parts = expiryDateInput.split("-");
      if (parts.length !== 3) {
        showToast("Format tanggal tidak valid (harus YYYY-MM-DD).");
        return;
      }
      const expDate = new Date(`${expiryDateInput}T23:59:59`);
      const expTimestamp = expDate.getTime();
      if (Number.isNaN(expTimestamp)) {
        showToast("Tanggal tidak valid.");
        return;
      }
      const profileRef = ref(db, `users/${editingUser.uid}/profile`);
      await update(profileRef, {
        planExpiresAt: expTimestamp,
        plan: "plus",
        planName: "Plus",
        updatedAt: Date.now(),
      });
      showToast(`Masa aktif ${editingUser.profile.displayName} berhasil diperbarui hingga ${expiryDateInput}.`);
      setEditingUser(null);
    } catch (err) {
      console.error("Gagal menyimpan tanggal expired:", err);
      showToast(`Gagal: ${err.message}`);
    }
  };

  const setPresetDate = (mode) => {
    const now = new Date();
    if (mode === "target-2027") {
      setExpiryDateInput("2027-09-09");
      return;
    }
    if (mode === "1m") {
      now.setMonth(now.getMonth() + 1);
    } else if (mode === "3m") {
      now.setMonth(now.getMonth() + 3);
    } else if (mode === "1y") {
      now.setFullYear(now.getFullYear() + 1);
    }
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    setExpiryDateInput(`${yyyy}-${mm}-${dd}`);
  };

  const handleInspectChat = (userItem) => {
    setInspectUser(userItem);
    const convIds = Object.keys(userItem.conversations || {});
    setSelectedConvId(convIds[0] || null);
  };

  const filteredUsers = usersList.filter((item) => {
    const p = item.profile;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.displayName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      item.uid.toLowerCase().includes(q);

    if (!matchSearch) return false;

    if (filterPlan === "plus") return p.plan === "plus" && p.status !== "banned";
    if (filterPlan === "free") return p.plan !== "plus" && p.status !== "banned";
    if (filterPlan === "banned") return p.status === "banned";
    return true;
  });

  const totalUsers = usersList.length;
  const plusUsers = usersList.filter((u) => u.profile.plan === "plus" && u.profile.status !== "banned").length;
  const bannedUsers = usersList.filter((u) => u.profile.status === "banned").length;
  const totalConvs = usersList.reduce((acc, curr) => acc + (curr.conversationsCount || 0), 0);

  const inspectConvs = inspectUser
    ? Object.entries(inspectUser.conversations || {}).map(([id, conv]) => ({
        id,
        ...conv,
      })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    : [];

  const activeChat = inspectConvs.find((c) => c.id === selectedConvId) || inspectConvs[0] || null;

  const isPermissionDenied = Boolean(
    dbError && (dbError.includes("permission_denied") || dbError.includes("Client doesn't have permission"))
  );

  return (
    <div className="admin-page">
      <div className="admin-page-inner">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-left">
            <a href="/" className="admin-back-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Aplikasi Chat Utama</span>
            </a>
            <div className="admin-title-wrap">
              <h1 className="admin-title">Panel Admin M Putra Ramadhani</h1>
              <span className="admin-route-badge">/admin/page=031104</span>
            </div>
          </div>
          <div className="admin-header-right">
            {adminUser ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--accent-bright)", background: "rgba(203,168,116,0.12)", padding: "4px 10px", borderRadius: "999px", border: "1px solid rgba(203,168,116,0.25)" }}>
                  👤 {adminUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="admin-action-btn"
                  style={{ padding: "4px 10px", fontSize: "11px" }}
                >
                  Keluar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="admin-action-btn btn-gold"
                style={{ padding: "6px 14px", fontSize: "12px", fontWeight: 600 }}
              >
                🔐 Masuk Akun Admin
              </button>
            )}

            <div className="admin-backend-pill" title="Koneksi Backend Firebase">
              <span className="admin-backend-pill-tag">BACKEND</span>
              <span className="admin-backend-pill-node">node: /users</span>
              {lastSyncTime && <span className="admin-backend-pill-time">sync: {lastSyncTime}</span>}
            </div>

            <div className="admin-live-indicator">
              <span className="admin-live-dot" />
              <span>{dbError ? "Akses Ditolak" : "Database Terhubung"}</span>
            </div>
          </div>
        </header>

        {/* Permission Denied Solution Box */}
        {isPermissionDenied && (
          <div style={{
            background: "rgba(30, 18, 18, 0.85)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "16px",
            padding: "24px 28px",
            boxShadow: "0 15px 40px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#f87171" }}>
              <span style={{ fontSize: "20px" }}>⚠️</span>
              <strong style={{ fontSize: "16px" }}>
                Solusi: Perbarui Security Rules di Firebase Console
              </strong>
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "#fca5a5", lineHeight: 1.6 }}>
              Firebase menolak akses pembacaan node root <code>/users</code> karena aturan (Security Rules) saat ini hanya mengizinkan pembacaan per sub-node <code>$uid === auth.uid</code>.
              Untuk mengizinkan admin membaca dan mengelola seluruh data pengguna, tambahkan izin <code>".read": "auth != null"</code> dan <code>".write": "auth != null"</code> di level <code>"users"</code>.
            </p>

            <div style={{
              background: "#0d0d10",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "14px 16px",
              fontFamily: "ui-monospace, monospace",
              fontSize: "12px",
              color: "#e0c393",
              overflowX: "auto",
              position: "relative"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>Salin aturan berikut ke Firebase Console &gt; Realtime Database &gt; Rules:</span>
                <button
                  type="button"
                  onClick={handleCopyRules}
                  style={{
                    background: rulesCopied ? "#22c55e" : "rgba(203,168,116,0.2)",
                    border: "1px solid rgba(203,168,116,0.4)",
                    color: rulesCopied ? "#000" : "#e0c393",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {rulesCopied ? "✓ Berhasil Disalin" : "📋 Salin Rules Lengkap"}
                </button>
              </div>
              <pre style={{ margin: 0 }}>{RECOMMENDED_RULES_JSON}</pre>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "4px" }}>
              <button
                type="button"
                className="admin-action-btn btn-gold"
                onClick={() => setReloadTrigger((n) => n + 1)}
                style={{ padding: "8px 18px", fontSize: "12px", fontWeight: 600 }}
              >
                🔄 Coba Muat Ulang Database Sekarang
              </button>
              {!adminUser && (
                <button
                  type="button"
                  className="admin-action-btn"
                  onClick={() => setShowLoginModal(true)}
                  style={{ padding: "8px 18px", fontSize: "12px" }}
                >
                  🔐 Masuk Akun Terlebih Dahulu
                </button>
              )}
              <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>
                Setelah Rules di-publish di Firebase Console, klik tombol Coba Muat Ulang di atas.
              </span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-label">Total Pengguna</span>
            <span className="admin-stat-num">{totalUsers}</span>
            <span className="admin-stat-sub">Terdaftar di database</span>
          </div>
          <div className="admin-stat-card highlight">
            <span className="admin-stat-label">Pengguna Plus</span>
            <span className="admin-stat-num">{plusUsers}</span>
            <span className="admin-stat-sub">Paket aktif tanpa batas</span>
          </div>
          <div className="admin-stat-card danger">
            <span className="admin-stat-label">Akun Diblokir</span>
            <span className="admin-stat-num">{bannedUsers}</span>
            <span className="admin-stat-sub">Status ditangguhkan</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Total Percakapan</span>
            <span className="admin-stat-num">{totalConvs}</span>
            <span className="admin-stat-sub">Seluruh riwayat sesi</span>
          </div>
        </div>

        {/* Toolbar Search & Filters */}
        <div className="admin-toolbar">
          <div className="admin-search-box">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" className="admin-search-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Cari nama, email, atau UID pengguna..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="admin-search-clear" onClick={() => setSearch("")}>×</button>
            )}
          </div>

          <div className="admin-filter-tabs">
            <button type="button" className={`admin-filter-tab ${filterPlan === "all" ? "active" : ""}`} onClick={() => setFilterPlan("all")}>
              Semua ({totalUsers})
            </button>
            <button type="button" className={`admin-filter-tab ${filterPlan === "plus" ? "active" : ""}`} onClick={() => setFilterPlan("plus")}>
              Plus ({plusUsers})
            </button>
            <button type="button" className={`admin-filter-tab ${filterPlan === "free" ? "active" : ""}`} onClick={() => setFilterPlan("free")}>
              Free ({totalUsers - plusUsers - bannedUsers})
            </button>
            <button type="button" className={`admin-filter-tab ${filterPlan === "banned" ? "active" : ""}`} onClick={() => setFilterPlan("banned")}>
              Diblokir ({bannedUsers})
            </button>
          </div>
        </div>

        {/* Main Users Table */}
        <div className="admin-card">
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Paket</th>
                  <th>Status</th>
                  <th>Masa Berlaku</th>
                  <th>Percakapan</th>
                  <th>Aksi Kontrol</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                      Memuat data pengguna dari database realtime...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px" }}>
                      {dbError ? (
                        <span style={{ color: "#f87171" }}>
                          Gagal memuat: {dbError}. Periksa Firebase Security Rules di atas.
                        </span>
                      ) : search ? (
                        "Tidak ada pengguna yang cocok dengan pencarian."
                      ) : (
                        "Belum ada data pengguna di database."
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((item) => {
                    const p = item.profile;
                    const isPlus = p.plan === "plus";
                    const isBanned = p.status === "banned";
                    const expNum = Number(p.planExpiresAt);
                    const isExpired = isPlus && expNum && !Number.isNaN(expNum) && Date.now() > expNum;

                    return (
                      <tr key={item.uid} className={isBanned ? "row-banned" : ""}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-avatar">
                              {p.displayName ? p.displayName.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="admin-user-details">
                              <span className="admin-user-name">
                                {p.displayName}
                                {isPlus && <span style={{ color: "var(--accent-bright)" }}>★</span>}
                              </span>
                              <span className="admin-user-email">{p.email}</span>
                              <span className="admin-uid-mono">UID: {item.uid}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`admin-badge-plan ${isPlus ? "plus" : "free"}`}>
                            {isPlus ? "PLUS" : "FREE"}
                          </span>
                        </td>

                        <td>
                          <span className={`admin-badge-status ${isBanned ? "banned" : "active"}`}>
                            {isBanned ? "Diblokir" : "Aktif"}
                          </span>
                        </td>

                        <td>
                          {isPlus ? (
                            <div className="admin-expiry-wrap">
                              <span className="admin-expiry-date">{formatDateDisplay(p.planExpiresAt)}</span>
                              <span className={`admin-expiry-remain ${isExpired ? "expired" : ""}`}>
                                {isExpired
                                  ? "Sudah Kedaluwarsa"
                                  : expNum
                                  ? `${Math.ceil((expNum - Date.now()) / (1000 * 60 * 60 * 24))} hari tersisa`
                                  : "Permanen"}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-faint)" }}>—</span>
                          )}
                        </td>

                        <td>
                          <span style={{ fontWeight: 600, color: "var(--text)" }}>
                            {item.conversationsCount} sesi
                          </span>
                        </td>

                        <td>
                          <div className="admin-actions-cell">
                            <button
                              type="button"
                              className={`admin-action-btn ${isPlus ? "" : "btn-gold"}`}
                              onClick={() => handleTogglePlan(item)}
                              title={isPlus ? "Turunkan ke paket Free" : "Tingkatkan ke paket Plus"}
                            >
                              {isPlus ? "Turunkan ke Free" : "Jadikan Plus"}
                            </button>

                            <button
                              type="button"
                              className="admin-action-btn"
                              onClick={() => handleOpenExpiry(item)}
                              title="Ubah batas kedaluwarsa langganan"
                            >
                              Atur Expired
                            </button>

                            <button
                              type="button"
                              className="admin-action-btn btn-gold"
                              onClick={() => handleInspectChat(item)}
                              title="Lihat riwayat percakapan pengguna ini"
                            >
                              Pantau Chat ({item.conversationsCount})
                            </button>

                            <button
                              type="button"
                              className={`admin-action-btn ${isBanned ? "btn-success" : "btn-danger"}`}
                              onClick={() => handleToggleBan(item)}
                              title={isBanned ? "Buka blokir akun ini" : "Blokir akun ini"}
                            >
                              {isBanned ? "Buka Blokir" : "Blokir Akun"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Login Admin */}
      {showLoginModal && (
        <div className="admin-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Masuk ke Akun Administrator</h3>
              <button type="button" className="admin-modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-dim)" }}>
              Masuk dengan akun Firebase Anda untuk mengakses dan mengelola database realtime pengguna.
            </p>

            {loginError && (
              <div style={{ color: "#f87171", fontSize: "12px", background: "rgba(239,68,68,0.1)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.25)" }}>
                {loginError}
              </div>
            )}

            <button
              type="button"
              className="admin-action-btn btn-gold"
              onClick={handleLoginGoogle}
              disabled={loginLoading}
              style={{ padding: "12px", justifyContent: "center", width: "100%", fontSize: "13px", fontWeight: 600 }}
            >
              {loginLoading ? "Memproses..." : "Masuk dengan Google"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "6px 0", color: "var(--text-faint)", fontSize: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span>atau email & password</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            <form onSubmit={handleLoginEmail} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-faint)", marginBottom: "4px" }}>Email:</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="admin-date-input"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-faint)", marginBottom: "4px" }}>Password:</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="admin-date-input"
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="admin-action-btn btn-gold"
                style={{ padding: "10px", justifyContent: "center", width: "100%", fontSize: "13px", marginTop: "6px" }}
              >
                {loginLoading ? "Memproses..." : "Masuk"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Expired Date */}
      {editingUser && (
        <div className="admin-modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Atur Masa Berlaku Langganan</h3>
              <button type="button" className="admin-modal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-dim)" }}>
              Pilih tanggal kedaluwarsa untuk <strong>{editingUser.profile.displayName}</strong> ({editingUser.profile.email}):
            </p>

            <div className="admin-preset-buttons">
              <button type="button" className="admin-preset-btn" onClick={() => setPresetDate("1m")}>+1 Bulan</button>
              <button type="button" className="admin-preset-btn" onClick={() => setPresetDate("3m")}>+3 Bulan</button>
              <button type="button" className="admin-preset-btn" onClick={() => setPresetDate("1y")}>+1 Tahun</button>
              <button type="button" className="admin-preset-btn highlight-gold" onClick={() => setPresetDate("target-2027")}>
                ★ 09-09-2027
              </button>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-faint)", marginBottom: "6px" }}>
                Pilih Tanggal Langsung:
              </label>
              <input
                type="date"
                className="admin-date-input"
                value={expiryDateInput}
                onChange={(e) => setExpiryDateInput(e.target.value)}
              />
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="admin-action-btn" onClick={() => setEditingUser(null)}>
                Batal
              </button>
              <button type="button" className="admin-action-btn btn-gold" onClick={handleSaveExpiry}>
                Simpan Tanggal Expired
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pantau Chat Realtime */}
      {inspectUser && (
        <div className="admin-modal-overlay" onClick={() => setInspectUser(null)}>
          <div className="admin-modal admin-inspector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3 className="admin-modal-title">
                  Pantau Percakapan: {inspectUser.profile.displayName}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>
                  {inspectUser.profile.email} • UID: {inspectUser.uid}
                </span>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setInspectUser(null)}>×</button>
            </div>

            <div className="admin-inspector-body">
              {/* Left pane: conversations list */}
              <div className="admin-conv-list">
                {inspectConvs.length === 0 ? (
                  <div style={{ padding: "20px", color: "var(--text-faint)", fontSize: "13px", textAlign: "center" }}>
                    Pengguna ini belum memiliki riwayat obrolan.
                  </div>
                ) : (
                  inspectConvs.map((c) => {
                    const isSelected = (activeChat?.id === c.id);
                    const msgCount = Array.isArray(c.messages) ? c.messages.length : 0;
                    return (
                      <div
                        key={c.id}
                        className={`admin-conv-item ${isSelected ? "active" : ""}`}
                        onClick={() => setSelectedConvId(c.id)}
                      >
                        <span className="admin-conv-title">{c.title || "Percakapan Tanpa Judul"}</span>
                        <div className="admin-conv-meta">
                          <span>{msgCount} pesan</span>
                          <span>{formatDateDisplay(c.updatedAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right pane: message thread */}
              <div className="admin-conv-thread">
                {!activeChat ? (
                  <div className="admin-empty-thread">
                    <span>Pilih percakapan dari daftar di sebelah kiri untuk melihat pesan.</span>
                  </div>
                ) : !Array.isArray(activeChat.messages) || activeChat.messages.length === 0 ? (
                  <div className="admin-empty-thread">
                    <span>Tidak ada pesan dalam sesi percakapan ini.</span>
                  </div>
                ) : (
                  activeChat.messages.map((m, idx) => {
                    const isUser = m.role === "user";
                    return (
                      <div key={idx} className={`admin-msg-bubble-wrap ${isUser ? "user" : "assistant"}`}>
                        <span className="admin-msg-sender">
                          {isUser ? inspectUser.profile.displayName || "User" : "M Putra Ramadhani (AI)"}
                        </span>

                        {m.attachments && m.attachments.length > 0 && (
                          <div className="admin-msg-attachments">
                            {m.attachments.map((att, aIdx) => {
                              const src = att.dataUrl || att.url || (typeof att === "string" ? att : "");
                              if (src && (att.isImage || src.startsWith("data:image/"))) {
                                return (
                                  <img
                                    key={aIdx}
                                    src={src}
                                    alt="Lampiran"
                                    className="admin-msg-photo"
                                  />
                                );
                              }
                              return (
                                <div key={aIdx} style={{ fontSize: "11px", color: "var(--accent-bright)", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "6px" }}>
                                  📎 {att.name || "File Lampiran"}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="admin-msg-bubble">
                          {m.content || (m.error ? `Error: ${m.error}` : "—")}
                        </div>

                        {m.at && <span className="admin-msg-time">{m.at}</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="admin-toast">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

const rootEl = document.getElementById("admin-root");
if (rootEl) {
  createRoot(rootEl).render(<AdminApp />);
}
