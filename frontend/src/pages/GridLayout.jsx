import React, { useState, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { notification, Badge } from 'antd';
import Logo from 'assets/logowhite.svg';
import { AppContext } from './App';
import MainMenu from './MainMenu';
import { Menu as MenuIcon, X, Bell, Search, ChevronRight } from 'lucide-react';
import { isRH } from './commons';

export const LayoutContext = React.createContext({});

const ROUTE_LABELS = {
    '/app/rh/turnos':                     { label: 'Plano de Horário',               icon: '📅' },
    '/app/rh/ferias':                     { label: 'Pedido de Férias',               icon: '🌴' },
    '/app/rh/justificacoes/pessoal':      { label: 'Justificações',                  icon: '📝' },
    '/app/rh/trocas-turno':               { label: 'Trocas de Turno',                icon: '🔄' },
    '/app/rh/registos':                   { label: 'Registo de Picagens',            icon: '🕐' },
    '/app/rh/registosv3':                 { label: 'Picagens V3',                    icon: '🕐' },
    '/app/rh/plan':                       { label: 'Plano de Horários',              icon: '📋' },
    '/app/rh/departamentos':              { label: 'Departamentos e Chefes',         icon: '🏢' },
    '/app/rh/processamento':              { label: 'Processamento Salarial',         icon: '💰' },
    '/app/rh/gestao-ferias':              { label: 'Gestão de Férias',               icon: '🌴' },
    '/app/rh/justificacoes/chefe':        { label: 'Justificações do Departamento',  icon: '📝' },
    '/app/rh/justificacoes/rh':           { label: 'Justificações (RH)',             icon: '📝' },
    '/app/rh/registos-chefe':             { label: 'Picagens do Departamento',       icon: '🕐' },
    '/app/rh/colaboradores-departamento': { label: 'Colaboradores',                  icon: '👥' },
    '/app/rh/registos-pessoal':           { label: 'As Minhas Picagens',             icon: '🕐' },
};

export default () => {
    const [api, contextHolder] = notification.useNotification();
    const { auth, handleLogout } = useContext(AppContext);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const openNotification = (status, placement, message, description) => {
        const config = {
            message,
            description,
            placement,
            className: 'font-sans',
            style: { borderRadius: '12px' }
        };
        if (status === 'error')   api.error(config);
        else if (status === 'success') api.success(config);
        else if (status === 'warning') api.warning(config);
        else api.info(config);
    };

    const userIsRH    = isRH(auth);
    const userIsChefe = auth?.isChefe;
    const papel = userIsRH ? 'Recursos Humanos' : userIsChefe ? 'Chefe de Departamento' : 'Colaborador';
    const papelColor = userIsRH ? 'from-purple-500 to-purple-700' : userIsChefe ? 'from-amber-500 to-orange-600' : 'from-blue-500 to-blue-700';

    const currentRoute = ROUTE_LABELS[location.pathname];

    return (
        <LayoutContext.Provider value={{ openNotification }}>
            {contextHolder}

            <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">

                {/* ── Desktop Sidebar ── */}
                <aside className="hidden md:flex flex-col w-[264px] bg-[#0F172A] text-white shadow-2xl z-30 shrink-0 relative">
                    {/* Gradient accent line */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                    {/* Logo area */}
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

                    {/* Navigation */}
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

                            {/* Breadcrumb */}
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
                            {/* Search hint */}
                            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-slate-400 cursor-pointer hover:bg-slate-200 transition-colors">
                                <Search size={12} />
                                <span>Pesquisar...</span>
                                <kbd className="px-1 py-0.5 bg-white rounded text-[10px] shadow-sm border border-slate-200">⌘K</kbd>
                            </div>

                            {/* Notification Bell */}
                            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                                <Bell size={18} />
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white" />
                            </button>

                            {/* Divider */}
                            <div className="h-7 w-px bg-slate-200 mx-1" />

                            {/* User Info */}
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

                    {/* Page Content */}
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