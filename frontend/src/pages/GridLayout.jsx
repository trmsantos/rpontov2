import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { notification } from 'antd';
import { AppContext } from './App';
import MainMenu from './MainMenu';
import { Menu as MenuIcon, X, Bell, Search, ChevronRight, ArrowLeftRight, CheckSquare, RefreshCw } from 'lucide-react';
import { isRH } from './commons';
import { fetchPost } from 'utils/fetch';
import { API_URL } from 'config';
import dayjs from 'dayjs';

export const LayoutContext = React.createContext({});

const ROUTE_LABELS = {
    '/app/rh/turnos':                     { label: 'Plano de Horário'},
    '/app/rh/ferias':                     { label: 'Pedido de Férias' },
    '/app/rh/justificacoes/pessoal':      { label: 'Justificações' },
    '/app/rh/trocas-turno':               { label: 'Trocas de Turno'},
    '/app/rh/registos':                   { label: 'Registo de Picagens' },
    '/app/rh/registosv3':                 { label: 'Picagens V3'},
    '/app/rh/plan':                       { label: 'Plano de Horários' },
    '/app/rh/departamentos':              { label: 'Departamentos e Chefes' },
    '/app/rh/processamento':              { label: 'Processamento Salarial' },
    '/app/rh/gestao-ferias':              { label: 'Gestão de Férias' },
    '/app/rh/justificacoes/chefe':        { label: 'Justificações do Departamento' },
    '/app/rh/justificacoes/rh':           { label: 'Justificações (RH)'},
    '/app/rh/justificacoes/chefeturno':   { label: 'Justificações (Chefe Turno)' },
    '/app/rh/registos-chefe':             { label: 'Picagens do Departamento' },
    '/app/rh/colaboradores-departamento': { label: 'Colaboradores' },
    '/app/rh/registos-pessoal':           { label: 'As Minhas Picagens' },
    '/app/rh/gestao-chefes-turno':        { label: 'Gestão Chefes de Turno' },
};


const NotifIcon = ({ tipo }) => {
    if (tipo === 'troca_pendente') return <ArrowLeftRight size={14} className="text-indigo-500 shrink-0 mt-0.5" />;
    if (tipo === 'troca_aprovar')  return <CheckSquare    size={14} className="text-amber-500  shrink-0 mt-0.5" />;
    if (tipo === 'troca_aprovada') return <CheckSquare    size={14} className="text-green-500  shrink-0 mt-0.5" />;
    return <Bell size={14} className="text-slate-400 shrink-0 mt-0.5" />;
};


const NotificacoesDropdown = ({ notificacoes, loading, onClose, onNavigate, onRefresh }) => (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
                <Bell size={14} className="text-slate-600" />
                <span className="text-sm font-bold text-slate-700">Notificações</span>
                {notificacoes.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
                        {notificacoes.length}
                    </span>
                )}
            </div>
            <button
                onClick={onRefresh}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                title="Actualizar"
            >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>

        <div className="max-h-72 overflow-y-auto">
            {loading && notificacoes.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                    <RefreshCw size={16} className="animate-spin mr-2" />
                    <span className="text-sm">A carregar...</span>
                </div>
            ) : notificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <Bell size={24} className="mb-2 opacity-30" />
                    <span className="text-sm font-medium">Sem notificações</span>
                </div>
            ) : (
                notificacoes.map((n) => (
                    <button
                        key={n.id}
                        onClick={() => {
                            onNavigate('/app/rh/trocas-turno');
                            onClose();
                        }}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-b-0 text-left group"
                    >
                        <NotifIcon tipo={n.tipo} />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 leading-snug">
                                {n.titulo}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                {n.mensagem}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                {n.data ? dayjs(n.data).format('DD/MM/YYYY HH:mm') : ''}
                            </p>
                        </div>
                        {!n.lida && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1" />
                        )}
                    </button>
                ))
            )}
        </div>

        {notificacoes.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                <button
                    onClick={() => { onNavigate('/app/rh/trocas-turno'); onClose(); }}
                    className="w-full text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    Ver todas as trocas
                </button>
            </div>
        )}
    </div>
);


const POLL_INTERVAL_MS = 30_000;

function useNotificacoes(auth) {
    const [count,          setCount]          = useState(0);
    const [notificacoes,   setNotificacoes]   = useState([]);
    const [loading,        setLoading]        = useState(false);
    const timerRef = useRef(null);

    const fetchNotifs = useCallback(async (withDetails = false) => {
        if (!auth?.num) return;

        const filterPayload = {
            num:        auth.num,
            isChefe:    auth.isChefe  || false,
            deps_chefe: auth.deps_chefe || [],
        };

        try {
            if (withDetails) {
                setLoading(true);
                const res = await fetchPost({
                    url:             `${API_URL}/rponto/sqlp/`,
                    withCredentials: true,
                    parameters:      { method: 'NotificacoesList' },
                    filter:          filterPayload,
                });
                setNotificacoes(res?.rows || []);
                setCount((res?.rows || []).length);
            } else {
                const res = await fetchPost({
                    url:             `${API_URL}/rponto/sqlp/`,
                    withCredentials: true,
                    parameters:      { method: 'NotificacoesCount' },
                    filter:          filterPayload,
                });
                setCount(res?.count || 0);
            }
        } catch {
            // falha silenciosa no polling
        } finally {
            setLoading(false);
        }
    }, [auth]);

    useEffect(() => {
        if (!auth?.num) return;

        fetchNotifs(false);

        timerRef.current = setInterval(() => {
            fetchNotifs(false);
        }, POLL_INTERVAL_MS);

        return () => clearInterval(timerRef.current);
    }, [auth, fetchNotifs]);

    const loadDetails = useCallback(() => {
        fetchNotifs(true);
    }, [fetchNotifs]);

    return { count, notificacoes, loading, loadDetails, refresh: () => fetchNotifs(true) };
}

// ═══════════════════════════════════════════════════════════════
export default () => {
    const [api, contextHolder] = notification.useNotification();
    const { auth, handleLogout } = useContext(AppContext);
    const navigate  = useNavigate();
    const location  = useLocation();

    const [isSidebarOpen,    setIsSidebarOpen]    = useState(false);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const notifRef = useRef(null);

    const { count, notificacoes, loading, loadDetails, refresh } = useNotificacoes(auth);

    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleBellClick = () => {
        const next = !showNotifDropdown;
        setShowNotifDropdown(next);
        if (next) loadDetails();
    };

    const openNotification = (status, placement, message, description) => {
        const config = {
            message,
            description,
            placement,
            className: 'font-sans',
            style: { borderRadius: '12px' }
        };
        if (status === 'error')        api.error(config);
        else if (status === 'success') api.success(config);
        else if (status === 'warning') api.warning(config);
        else                           api.info(config);
    };

    const userIsRH         = isRH(auth);
    const userIsChefe      = auth?.isChefe === true;
    const userIsChefeTurno = auth?.isChefeTurno === true;

    // ✅ CORRIGIDO: incluir isChefeTurno na determinação do papel
    const papel = userIsRH
        ? 'Recursos Humanos'
        : userIsChefe
            ? 'Chefe de Departamento'
            : userIsChefeTurno
                ? 'Chefe de Turno'
                : 'Colaborador';

    const papelColor = userIsRH
        ? 'from-purple-500 to-purple-700'
        : userIsChefe
            ? 'from-amber-500 to-orange-600'
            : userIsChefeTurno
                ? 'from-teal-500 to-emerald-600'
                : 'from-blue-500 to-blue-700';

    const currentRoute = ROUTE_LABELS[location.pathname];

    return (
        <LayoutContext.Provider value={{ openNotification }}>
            {contextHolder}

            <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">

                {/* ── Desktop Sidebar ── */}
                <aside className="hidden md:flex flex-col w-[264px] bg-[#0F172A] text-white shadow-2xl z-30 shrink-0 relative">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <div className="h-[60px] flex items-center px-5 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <span className="text-white text-xs font-black">HR</span>
                            </div>
                            <div>
                                <p className="text-white font-black text-sm tracking-tight">Portal RH</p>
                                <p className="text-slate-500 text-[9px] font-medium uppercase tracking-wider">Sistema de Gestão</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <MainMenu auth={auth} handleLogout={handleLogout} />
                    </div>
                </aside>

                {/* ── Mobile Overlay ── */}
                <div
                    className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsSidebarOpen(false)}
                />

                {/* ── Mobile Drawer ── */}
                <div className={`fixed inset-y-0 left-0 w-[264px] bg-[#0F172A] text-white z-50 transform transition-transform duration-300 md:hidden shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-[60px] flex items-center justify-between px-5 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white text-xs font-black">HR</span>
                            </div>
                            <p className="text-white font-black text-sm">Portal RH</p>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 h-[calc(100vh-60px)] overflow-y-auto">
                        <MainMenu auth={auth} handleLogout={handleLogout} onToggleDrawer={() => setIsSidebarOpen(false)} />
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

                    {/* Top Header */}
                    <header className="h-[60px] bg-white/90 backdrop-blur-sm border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-6 z-20 shrink-0 shadow-sm">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <MenuIcon size={20} />
                            </button>

                            <div className="hidden sm:flex items-center gap-2 text-sm">
                                <span className="text-slate-400 font-medium">Portal RH</span>
                                {currentRoute && (
                                    <>
                                        <ChevronRight size={14} className="text-slate-300" />
                                        <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                                            <span>{currentRoute.icon}</span>
                                            {currentRoute.label}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">

                            <div className="relative" ref={notifRef}>
                                <button
                                    onClick={handleBellClick}
                                    className={`relative p-2 rounded-lg transition-colors
                                        ${showNotifDropdown
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <Bell size={18} />
                                    {count > 0 ? (
                                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                                            {count > 9 ? '9+' : count}
                                        </span>
                                    ) : (
                                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-slate-300 rounded-full ring-1 ring-white" />
                                    )}
                                </button>

                                {showNotifDropdown && (
                                    <NotificacoesDropdown
                                        notificacoes={notificacoes}
                                        loading={loading}
                                        onClose={() => setShowNotifDropdown(false)}
                                        onNavigate={(path) => navigate(path, { state: { tstamp: Date.now() }, replace: true })}
                                        onRefresh={refresh}
                                    />
                                )}
                            </div>

                            <div className="h-7 w-px bg-slate-200 mx-1" />

                            <div className="flex items-center gap-2.5 pl-1">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[13px] font-bold text-slate-800 leading-tight">
                                        {auth?.first_name} {auth?.last_name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 leading-tight">{papel}</p>
                                </div>
                                <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${papelColor} text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white shrink-0`}>
                                    {auth?.first_name?.charAt(0) || 'U'}
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 scroll-smooth bg-[#F8FAFC]">
                        <div className="w-full max-w-[1920px] mx-auto min-h-full">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </LayoutContext.Provider>
    );
};