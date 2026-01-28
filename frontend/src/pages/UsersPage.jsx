import React, { useEffect, useMemo, useState } from "react";
import { apiService } from "../services/api";
import { useAuth } from "../context/AuthContext"; // подстрой путь
import { FiPlus, FiSave } from "react-icons/fi";
import "../styles/UsersPage.css";

const ROLE_OPTIONS = [
  { value: "student", label: "Студент" },
  { value: "instructor", label: "Преподаватель" },
  { value: "admin", label: "Админ" },
];

export default function UsersPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "student",
    first_name: "",
    last_name: "",
    phone: "",
    avatar_url: "",
    is_active: true,
  });

  const isAdmin = (user?.role === "admin");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiService.admin.getUsers();
      setUsers(res.data || []);
    } catch (e) {
      console.error("Ошибка загрузки пользователей:", e);
      alert("Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      [u.email, u.first_name, u.last_name, u.role]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    );
  }, [users, query]);

  const changeRoleLocal = (id, role) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, role, _dirty: true } : u)));
  };

  const saveRole = async (u) => {
    try {
      await apiService.admin.updateUserRole(u.id, u.role);
      setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, _dirty: false } : x)));
    } catch (e) {
      console.error("Ошибка обновления роли:", e);
      alert("Не удалось обновить роль");
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      alert("Email и пароль обязательны");
      return;
    }
    setCreating(true);
    try {
      await apiService.admin.createUser(newUser);
      setShowCreate(false);
      setNewUser({
        email: "",
        password: "",
        role: "student",
        first_name: "",
        last_name: "",
        phone: "",
        avatar_url: "",
        is_active: true,
      });
      await loadUsers();
    } catch (e) {
      console.error("Ошибка создания пользователя:", e);
      alert("Не удалось создать пользователя");
    } finally {
      setCreating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="users-header">
        <div>
            <h2>Пользователи</h2>
            <div className="subtitles">
                <p>Доступно только администратору.</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-page">
        <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
            <h2 style={{ margin: 0 }}>Пользователи</h2>
            <div style={{ opacity: 0.7 }}>Управление ролями и создание пользователей</div>
            </div>

            <div className="users-header-actions">
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <FiPlus /> Новый пользователь
                </button>
            </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <input
            className="users-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск (email/имя/роль)…"
            style={{ minWidth: 280, padding: 8 }}
            />
            <button className="btn btn-primary" onClick={loadUsers} disabled={loading}>Обновить</button>
        </div>

        {loading ? (
            <div style={{ marginTop: 16 }}>Загрузка…</div>
        ) : (
            <div className="users-table-wrapper">
                <table className="users-table">
                <thead>
                <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Email</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Имя</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Роль</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Активен</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}></th>
                </tr>
                </thead>

                <tbody>
                {filtered.map((u) => (
                    <tr key={u.id}>
                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{u.email}</td>
                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                        {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                        <select value={u.role} onChange={(e) => changeRoleLocal(u.id, e.target.value)}>
                        {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                        </select>
                        {u._dirty ? <span style={{ marginLeft: 8, opacity: 0.7 }}>(не сохранено)</span> : null}
                    </td>
                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                        {u.is_active ? "Да" : "Нет"}
                    </td>
                    <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                        <button
                        className="btn btn-primary"
                        onClick={() => saveRole(u)}
                        disabled={!u._dirty}
                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                        >
                        <FiSave /> Сохранить
                        </button>
                    </td>
                    </tr>
                ))}

                {filtered.length === 0 ? (
                    <tr>
                    <td colSpan={5} style={{ padding: 12, opacity: 0.7 }}>Ничего не найдено</td>
                    </tr>
                ) : null}
                </tbody>
            </table>
            </div>
        )}

        {showCreate && (
            <div
            onClick={() => !creating && setShowCreate(false)}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
            }}
            >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ width: "min(720px, 100%)", background: "#fff", borderRadius: 12, padding: 16 }}
            >
                <h3 style={{ marginTop: 0 }}>Создать пользователя</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                    Email *
                    <input
                    className="users-search"
                    value={newUser.email}
                    onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                    style={{ width: "100%", padding: 8 }}
                    />
                </label>

                <label>
                    Пароль *
                    <input
                    className="users-search"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                    style={{ width: "100%", padding: 8 }}
                    />
                </label>

                <label>
                    Роль
                    <select
                    value={newUser.role}
                    onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                    style={{ width: "100%", padding: 8 }}
                    >
                    {ROLE_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                    </select>
                </label>

                <label>
                    Телефон
                    <input
                    className="users-search"
                    value={newUser.phone}
                    onChange={(e) => setNewUser((p) => ({ ...p, phone: e.target.value }))}
                    style={{ width: "100%", padding: 8 }}
                    />
                </label>

                <label>
                    Имя
                    <input
                    className="users-search"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser((p) => ({ ...p, first_name: e.target.value }))}
                    style={{ width: "100%", padding: 8 }}
                    />
                </label>

                <label>
                    Фамилия
                    <input
                    className="users-search"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser((p) => ({ ...p, last_name: e.target.value }))}
                    style={{ width: "100%", padding: 8 }}
                    />
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                    Avatar URL
                    <input
                    className="users-search"
                    value={newUser.avatar_url}
                    onChange={(e) => setNewUser((p) => ({ ...p, avatar_url: e.target.value }))}
                    style={{ width: "100%", padding: 8 }}
                    />
                </label>

                <label style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                    className="users-search"
                    type="checkbox"
                    checked={newUser.is_active}
                    onChange={(e) => setNewUser((p) => ({ ...p, is_active: e.target.checked }))}
                    />
                    Активен
                </label>
                </div>

                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={creating}>Отмена</button>
                <button className="btn btn-primary" onClick={createUser} disabled={creating}>
                    {creating ? "Создание…" : "Создать"}
                </button>
                </div>
            </div>
            </div>
        )}
        </div>
    </div>
  );
}
