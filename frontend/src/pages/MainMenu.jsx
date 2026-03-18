import React, { useState } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { isRH } from "./commons";
import {
    LogOut, User, Users, ChevronDown, Clock, Calendar,
    Briefcase, LayoutDashboard, BarChart2, BanknoteIcon,
    FileText, Palmtree, ClipboardList, CheckSquare, ArrowLeftRight,
    ShieldCheck
} from 'lucide-react';
import { ROOT_URL } from "config";

const MENU_ID = "rponto-menu-01";

const MenuItem = ({ onClick, children, icon: Icon, active, badge }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg mb-0.5 text-left group transition-all duration-150
            ${active
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/8'
            }`}
    >
        <div className="flex items-center gap-2.5">
            {Icon && (
                <Icon size={14} className={active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0'} />
            )}
            <span className="leading-snug">{children}</span>
        </div>
        {badge > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${active ? 'bg-white/30 text-white' : 'bg-red-500 text-white'}`}>
                {badge}
            </span>
        )}
    </button>
);

const MenuSection = ({ title, isOpen, onToggle, children, icon: Icon, badge }) => (
    <div className="mb-1">
        <button
            onClick={onToggle}
            className={`w-full flex items-center justify-between px-3 py-2 text-[12px] font-semibold rounded-lg transition-all duration-150 group
                ${isOpen ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
            <div className="flex items-center gap-2.5">
                {Icon && <Icon size={13} className={isOpen ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'} />}
                <span className="uppercase tracking-wider text-[10px] font-black">{title}</span>
                {badge > 0 && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[16px] text-center">
                        {badge}
                    </span>
                )}
            </div>
            <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : 'text-slate-600'}`} />
        </button>

        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="ml-3 pl-3 border-l border-white/6 space-y-0.5 py-1 mt-0.5">
                {children}
            </div>
        </div>
    </div>
);

const LogoutModal = ({ isOpen, onClose, onConfirm, auth }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 border border-slate-100">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-2xl bg-red-100 mb-4">
                        <LogOut className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-base font-black text-gray-900">Terminar Sessão?</h3>
                    <p className="mt-1.5 text-sm text-gray-500">
                        <span className="font-semibold">{auth?.first_name}</span>, tens a certeza?
                    </p>
                </div>
                <div className="mt-5 flex gap-2.5">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
                        Sair
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ({ onToggleDrawer, handleLogout, auth }) => {
    const navigate  = useNavigate();
    const location  = useLocation();

    const areaPessoalPaths = [
        '/app/rh/registos-pessoal', '/app/rh/turnos', '/app/rh/ferias',
        '/app/rh/justificacoes/pessoal', '/app/rh/trocas-turno'
    ];
    const rhPaths = [
        '/app/rh/registosv3', '/app/rh/plan',
        '/app/rh/justificacoes/rh', '/app/rh/departamentos', '/app/rh/processamento',
        '/app/rh/gestao-ferias', '/app/rh/justificacoes/chefe', '/app/rh/registos-chefe',
        '/app/rh/colaboradores-departamento', '/app/rh/trocas-turno',
        '/app/rh/gestao-chefes-turno'
    ];
    const chefeTurnoPaths = [
        '/app/rh/justificacoes/chefeturno'
    ];

    const getInitialState = () => {
        try {
            const stored = localStorage.getItem(MENU_ID);
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        const currentPath = location.pathname;
        const inRH             = rhPaths.some(p => currentPath === p);
        const inAreaPessoal    = areaPessoalPaths.some(p => currentPath === p);
        const inChefeTurno     = chefeTurnoPaths.some(p => currentPath === p);
        return {
            areaPessoal: inAreaPessoal || (!inRH && !inChefeTurno),
            rh:          inRH,
            chefeTurno:  inChefeTurno,
        };
    };

    const [openSections,    setOpenSections]    = useState(getInitialState);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const toggleSection = (key) => {
        const next = { ...openSections, [key]: !openSections[key] };
        setOpenSections(next);
        localStorage.setItem(MENU_ID, JSON.stringify(next));
    };

    const handleNavigation = (path, stateProps = {}) => {
        navigate(path, { state: { ...stateProps, tstamp: Date.now() }, replace: true });
        if (onToggleDrawer) onToggleDrawer();
    };

    const isActive         = (path) => location.pathname === path;
    const userIsRH         = isRH(auth);
    const userIsChefe      = auth?.isChefe;
    const userIsChefeTurno = auth?.isChefeTurno;

    // Trocas de turno: APENAS chefe do departamento DPROD
    const temAcessoTrocas = userIsChefe &&
        (auth?.deps_chefe || []).map(d => String(d).trim()).includes('DPROD');

    // Papel para o badge do footer
    const getRoleLabel = () => {
        if (userIsRH) return 'Recursos Humanos';
        if (userIsChefe) return 'Chefe de Depart.';
        if (userIsChefeTurno) return 'Chefe de Turno';
        return 'Colaborador';
    };

    // Cor do avatar
    const getAvatarGradient = () => {
        if (userIsRH) return 'from-purple-500 to-purple-700';
        if (userIsChefe) return 'from-amber-500 to-orange-600';
        if (userIsChefeTurno) return 'from-teal-500 to-emerald-600';
        return 'from-blue-500 to-blue-700';
    };

    return (
        <>
            <div className="flex flex-col h-full">
                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">

                    {/* ── Área Pessoal ── */}
                    <MenuSection
                        title="Área Pessoal"
                        icon={User}
                        isOpen={openSections.areaPessoal}
                        onToggle={() => toggleSection('areaPessoal')}
                    >
                        <MenuItem
                            onClick={() => handleNavigation('/app/rh/registos-pessoal', { num: auth?.num })}
                            icon={Clock}
                            active={isActive('/app/rh/registos-pessoal')}
                        >
                            Registo de Picagens
                        </MenuItem>
                        <MenuItem
                            onClick={() => handleNavigation('/app/rh/turnos')}
                            icon={Briefcase}
                            active={isActive('/app/rh/turnos')}
                        >
                            Plano de Horário
                        </MenuItem>
                        <MenuItem
                            onClick={() => handleNavigation('/app/rh/ferias')}
                            icon={Palmtree}
                            active={isActive('/app/rh/ferias')}
                        >
                            Pedido de Férias
                        </MenuItem>
                        <MenuItem
                            onClick={() => handleNavigation('/app/rh/justificacoes/pessoal')}
                            icon={FileText}
                            active={isActive('/app/rh/justificacoes/pessoal')}
                        >
                            Justificações
                        </MenuItem>
                    </MenuSection>

                    {/* ── Chefe de Turno (DPROD) ── */}
                    {userIsChefeTurno && (
                        <MenuSection
                            title="Chefe de Turno"
                            icon={ShieldCheck}
                            isOpen={openSections.chefeTurno}
                            onToggle={() => toggleSection('chefeTurno')}
                        >
                            <MenuItem
                                onClick={() => handleNavigation('/app/rh/justificacoes/chefeturno')}
                                icon={FileText}
                                active={isActive('/app/rh/justificacoes/chefeturno')}
                            >
                                Justificações da Equipa
                            </MenuItem>
                        </MenuSection>
                    )}

                    {/* ── Recursos Humanos ── */}
                    {(userIsRH || userIsChefe) && (
                        <MenuSection
                            title="Recursos Humanos"
                            icon={Users}
                            isOpen={openSections.rh}
                            onToggle={() => toggleSection('rh')}
                        >
                            {/* === OPÇÕES EXCLUSIVAS RH === */}
                            {userIsRH && (
                                <>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/registosv3', { num: null })}
                                        icon={Clock}
                                        active={isActive('/app/rh/registosv3')}
                                    >
                                        Picagens (Visão RH)
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/plan', { num: null })}
                                        icon={Calendar}
                                        active={isActive('/app/rh/plan')}
                                    >
                                        Plano de Horários
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/justificacoes/rh')}
                                        icon={FileText}
                                        active={isActive('/app/rh/justificacoes/rh')}
                                    >
                                        Justificações (RH)
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/departamentos')}
                                        icon={BanknoteIcon}
                                        active={isActive('/app/rh/departamentos')}
                                    >
                                        Departamentos e Chefes
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/gestao-chefes-turno')}
                                        icon={ShieldCheck}
                                        active={isActive('/app/rh/gestao-chefes-turno')}
                                    >
                                        Gestão Chefes de Turno
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/processamento')}
                                        icon={BarChart2}
                                        active={isActive('/app/rh/processamento')}
                                    >
                                        Processamento Salarial
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/gestao-ferias')}
                                        icon={Palmtree}
                                        active={isActive('/app/rh/gestao-ferias')}
                                    >
                                        Gestão de Férias (RH)
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/registos-chefe')}
                                        icon={Clock}
                                        active={isActive('/app/rh/registos-chefe')}
                                    >
                                        Picagens do Departamento
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/colaboradores-departamento')}
                                        icon={ClipboardList}
                                        active={isActive('/app/rh/colaboradores-departamento')}
                                    >
                                        Colaboradores do Dep.
                                    </MenuItem>
                                </>
                            )}

                            {/* === OPÇÕES PARA CHEFES DE DEPARTAMENTO (não-RH) === */}
                            {!userIsRH && userIsChefe && (
                                <>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/justificacoes/chefe')}
                                        icon={CheckSquare}
                                        active={isActive('/app/rh/justificacoes/chefe')}
                                    >
                                        Justificações do Dep.
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/gestao-ferias')}
                                        icon={Palmtree}
                                        active={isActive('/app/rh/gestao-ferias')}
                                    >
                                        Gestão de Férias (Chefe)
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/registos-chefe')}
                                        icon={Clock}
                                        active={isActive('/app/rh/registos-chefe')}
                                    >
                                        Picagens do Departamento
                                    </MenuItem>
                                    <MenuItem
                                        onClick={() => handleNavigation('/app/rh/colaboradores-departamento')}
                                        icon={ClipboardList}
                                        active={isActive('/app/rh/colaboradores-departamento')}
                                    >
                                        Colaboradores do Dep.
                                    </MenuItem>
                                    {/* Gestão de Chefes de Turno — só chefes DPROD */}
                                    {(auth?.deps_chefe || []).includes('DPROD') && (
                                        <MenuItem
                                            onClick={() => handleNavigation('/app/rh/gestao-chefes-turno')}
                                            icon={ShieldCheck}
                                            active={isActive('/app/rh/gestao-chefes-turno')}
                                        >
                                            Gestão Chefes de Turno
                                        </MenuItem>
                                    )}
                                    {temAcessoTrocas && (
                                        <MenuItem
                                            onClick={() => handleNavigation('/app/rh/trocas-turno')}
                                            icon={ArrowLeftRight}
                                            active={isActive('/app/rh/trocas-turno')}
                                        >
                                            Trocas de Turno (DPROD)
                                        </MenuItem>
                                    )}
                                </>
                            )}
                        </MenuSection>
                    )}
                </nav>

                {/* Footer */}
                <div className="shrink-0 p-3 border-t border-white/5">
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 mb-1.5 hover:bg-white/8 transition-colors cursor-pointer group">
                        <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${getAvatarGradient()} text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0`}>
                            {auth?.first_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-slate-200 truncate leading-tight">
                                {auth?.first_name} {auth?.last_name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate leading-tight">
                                {getRoleLabel()}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="flex items-center gap-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 w-full px-3 py-2 rounded-xl transition-all duration-200 group"
                    >
                        <LogOut size={13} className="group-hover:text-red-400 transition-colors shrink-0" />
                        <span className="text-[12px] font-medium">Terminar Sessão</span>
                    </button>
                </div>
            </div>

            <LogoutModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
                auth={auth}
            />
        </>
    );
};