import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
    Button, Tag, Tooltip, Spin, Segmented, Divider,
    Badge, Space, Card, Typography, notification
} from 'antd';
import {
    LeftOutlined, RightOutlined, CalendarOutlined,
    ClockCircleOutlined, HomeOutlined, ToolOutlined,
    UserOutlined, TeamOutlined, CoffeeOutlined,
    CrownOutlined, SafetyOutlined
} from '@ant-design/icons';
import { API_URL } from 'config';
import { fetchPost } from 'utils/fetch';
import { AppContext } from './App';
import dayjs from 'dayjs';
import 'dayjs/locale/pt';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);
dayjs.locale('pt');

const { Text } = Typography;

// ── Mapeamento fixo de horas por sigla (fallback frontend) ─────
const HORAS_SIGLA = {
    NOI: { inicio: '00:00', fim: '08:00' },
    MAN: { inicio: '08:00', fim: '16:00' },
    TAR: { inicio: '16:00', fim: '00:00' },
    GER: { inicio: '09:00', fim: '18:00' },
    REF: { inicio: '09:00', fim: '18:00' },
    DSC: { inicio: null,    fim: null    },
    FER: { inicio: null,    fim: null    },
};

const resolverHoras = (sigla, hi, hf) => ({
    hora_inicio: hi || HORAS_SIGLA[sigla]?.inicio || null,
    hora_fim:    hf || HORAS_SIGLA[sigla]?.fim    || null,
});

// ── Configuração visual dos turnos ─────────────────────────────
const TURNO_CFG = {
    NOI: { bg: 'linear-gradient(135deg,#1e3a5f,#2d5a87)', light: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', label: 'Noite',    hours: '00:00–08:00' },
    MAN: { bg: 'linear-gradient(135deg,#059669,#10B981)', light: '#ECFDF5', border: '#10B981', text: '#047857', label: 'Manhã',    hours: '08:00–16:00' },
    TAR: { bg: 'linear-gradient(135deg,#D97706,#F59E0B)', light: '#FEF3C7', border: '#F59E0B', text: '#B45309', label: 'Tarde',    hours: '16:00–00:00' },
    GER: { bg: 'linear-gradient(135deg,#B45309,#F59E0B)', light: '#FFFBEB', border: '#F59E0B', text: '#92400E', label: 'Geral',    hours: '09:00–18:00' },
    DSC: { bg: 'linear-gradient(135deg,#6B7280,#9CA3AF)', light: '#F3F4F6', border: '#D1D5DB', text: '#4B5563', label: 'Descanso', hours: null           },
    REF: { bg: 'linear-gradient(135deg,#7C3AED,#8B5CF6)', light: '#F5F3FF', border: '#A78BFA', text: '#6D28D9', label: 'Reforço',  hours: '09:00–18:00'  },
    FER: { bg: 'linear-gradient(135deg,#7C3AED,#9333EA)', light: '#FAF5FF', border: '#C084FC', text: '#7E22CE', label: 'Férias',   hours: null           },
};

const EQUIPA_CFG = {
    A: { bg: '#3B82F6', text: '#FFF' },
    B: { bg: '#10B981', text: '#FFF' },
    C: { bg: '#F59E0B', text: '#FFF' },
    D: { bg: '#EF4444', text: '#FFF' },
    E: { bg: '#8B5CF6', text: '#FFF' },
};

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// ── Componentes auxiliares ─────────────────────────────────────
const RoleBadge = ({ role }) => {
    const cfg = {
        rh:          { icon: <SafetyOutlined />, color: 'purple', label: 'Recursos Humanos'      },
        chefe:       { icon: <CrownOutlined />,  color: 'gold',   label: 'Chefe de Departamento' },
        colaborador: { icon: <UserOutlined />,   color: 'blue',   label: 'Colaborador'           },
    };
    const c = cfg[role] || cfg.colaborador;
    return <Tag icon={c.icon} color={c.color} className="font-semibold text-xs px-2 py-0.5">{c.label}</Tag>;
};

const TurnoBadge = ({ sigla, equipas = [], showEquipas = false, size = 'sm' }) => {
    const cfg  = TURNO_CFG[sigla] || TURNO_CFG.DSC;
    const base = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]';
    return (
        <Tooltip title={
            <div className="p-1">
                <div className="font-bold mb-0.5">{cfg.label}</div>
                {cfg.hours && <div className="text-xs text-gray-300 flex items-center gap-1"><ClockCircleOutlined /> {cfg.hours}</div>}
                {sigla === 'GER' && <div className="text-xs text-amber-300 mt-0.5"><CoffeeOutlined /> Almoço: 13:00–14:00</div>}
                {showEquipas && equipas.length > 0 && <div className="text-xs mt-0.5">Equipas: {equipas.join(', ')}</div>}
            </div>
        } placement="top">
            <div className={`inline-flex items-center gap-1 rounded-lg font-bold cursor-default shadow-sm transition-transform hover:scale-105 ${base}`}
                 style={{ background: cfg.bg }}>
                <span className="text-white">{sigla}</span>
                {showEquipas && equipas.length > 0 && (
                    <div className="flex -space-x-1">
                        {equipas.map(eq => (
                            <div key={eq}
                                 className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] font-black border border-white shadow-sm"
                                 style={{ backgroundColor: EQUIPA_CFG[eq]?.bg || '#64748b', color: '#fff' }}>
                                {eq}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Tooltip>
    );
};

const groupByTurno = (arr) => {
    const g = {};
    (arr || []).forEach(eq => {
        const k = eq.turno_sigla;
        if (!g[k]) g[k] = [];
        g[k].push(eq.equipa);
    });
    return g;
};

// ── Célula colaborador ─────────────────────────────────────────
const CelulaDiaColab = ({ day, turnoInfo, isFds, isToday }) => {
    // turnoInfo.is_ferias pode vir do backend (campo na equipa) OU
    // ser injetado pelo renderCalendar quando a data está em ferias_datas
    const isFer    = turnoInfo?.is_ferias === true || turnoInfo?.turno_sigla === 'FER';
    const sigla    = isFer ? 'FER' : (turnoInfo?.turno_sigla || (isFds ? 'DSC' : null));
    const isTroca  = turnoInfo?.is_troca === true;
    const isDsc    = !sigla || sigla === 'DSC';

    const cfg = TURNO_CFG[sigla] || TURNO_CFG.DSC;

    const { hora_inicio, hora_fim } = resolverHoras(
        sigla,
        isFer ? null : turnoInfo?.hora_inicio,
        isFer ? null : turnoInfo?.hora_fim
    );

    return (
        <div className={`min-h-[100px] sm:min-h-[120px] p-2 border transition-all
            ${isToday  ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-300'
            : isFer    ? 'bg-purple-50 border-purple-200'
            : isFds    ? 'bg-slate-50  border-gray-200'
            : 'bg-white border-gray-200'}
            hover:shadow-md hover:z-10`}>

            {/* Cabeçalho do dia */}
            <div className="flex items-start justify-between mb-1.5">
                {isToday ? (
                    <Badge count="HOJE" size="small" style={{ backgroundColor: '#4F46E5', fontSize: '8px' }}>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-black text-xs shadow">{day}</div>
                    </Badge>
                ) : (
                    <span className={`text-sm sm:text-base font-bold
                        ${isFds ? 'text-slate-400' : isFer ? 'text-purple-600' : 'text-slate-700'}`}>
                        {day}
                    </span>
                )}
                <div className="flex flex-col items-end gap-0.5">
                    {isTroca && (
                        <Tooltip title="Troca de turno aprovada">
                            <span className="text-[8px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-bold">TROCA</span>
                        </Tooltip>
                    )}
                    {isFer && (
                        <Tooltip title="Férias aprovadas">
                            <span className="text-[8px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-bold">🌴 FÉR</span>
                        </Tooltip>
                    )}
                </div>
            </div>

            {/* Conteúdo */}
            <div className="flex flex-col gap-1">
                {isFer ? (
                    <div className="rounded-lg p-2 border border-purple-200 bg-purple-50 text-center">
                        <div className="text-lg leading-none mb-0.5">🌴</div>
                        <div className="text-[9px] font-bold text-purple-700">Férias</div>
                    </div>
                ) : !isDsc ? (
                    <div className="rounded-lg p-1.5 border"
                         style={{ backgroundColor: cfg.light, borderColor: cfg.border }}>
                        <div className="flex items-center gap-1 mb-0.5">
                            <div className="w-4 h-4 rounded-md flex items-center justify-center text-white text-[8px] font-black"
                                 style={{ background: cfg.bg }}>
                                {sigla}
                            </div>
                            <span className="text-[9px] font-bold" style={{ color: cfg.text }}>{cfg.label}</span>
                        </div>
                        {hora_inicio && (
                            <div className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                <ClockCircleOutlined className="text-[8px]" />
                                {hora_inicio}–{hora_fim || '?'}
                                {isTroca && <span className="ml-1 text-blue-500 font-bold">(troca)</span>}
                            </div>
                        )}
                        {sigla === 'GER' && (
                            <div className="text-[8px] text-amber-500 flex items-center gap-0.5">
                                <CoffeeOutlined className="text-[8px]" />
                                13:00–14:00
                            </div>
                        )}
                        {turnoInfo?.almoco_ini && (
                            <div className="text-[8px] text-amber-500 flex items-center gap-0.5">
                                <CoffeeOutlined className="text-[8px]" />
                                {turnoInfo.almoco_ini}–{turnoInfo.almoco_fim}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-3">
                        <span className="text-[10px] text-slate-300 font-medium">
                            {isFds ? 'Fim de semana' : 'Folga'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Célula RH/Chefe ────────────────────────────────────────────
const CelulaDiaCompleta = ({ day, dayData, isToday, viewMode }) => {
    const isFds     = dayData?.is_fds      ?? false;
    const isFeriado = dayData?.equipas?.some(e => e.is_feriado) ?? false;
    const feriado   = dayData?.equipas?.find(e => e.nome_feriado)?.nome_feriado;
    const gerList   = dayData?.ger || [];
    const armazem   = (dayData?.equipas || []).filter(e => e.esquema === 'Armazem');
    const producao  = (dayData?.equipas || []).filter(e => e.esquema && e.esquema !== 'Armazem');
    const showArm   = viewMode === 'geral' || viewMode === 'armazem';
    const showProd  = viewMode === 'geral' || viewMode === 'producao';
    const showGer   = viewMode === 'geral' || viewMode === 'ger';
    const armGrouped  = groupByTurno(armazem);
    const prodGrouped = groupByTurno(producao);
    const hasArm  = showArm  && Object.keys(armGrouped).length  > 0;
    const hasProd = showProd && Object.keys(prodGrouped).length > 0;
    const hasGer  = showGer  && gerList.length > 0;
    const hasAny  = hasArm || hasProd || hasGer;

    return (
        <div className={`min-h-[120px] sm:min-h-[140px] p-1.5 border transition-all relative hover:shadow-xl hover:z-10 hover:border-indigo-300
            ${isToday   ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50 border-indigo-300' : ''}
            ${isFeriado ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200' : ''}
            ${isFds && !isFeriado && !isToday ? 'bg-slate-50 border-gray-200' : ''}
            ${!isFds && !isFeriado && !isToday ? 'bg-white border-gray-200' : ''}`}>
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1">
                    {isToday ? (
                        <Badge count="HOJE" size="small" style={{ backgroundColor: '#4F46E5', fontSize: '7px' }}>
                            <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-black text-xs shadow">{day}</div>
                        </Badge>
                    ) : (
                        <span className={`text-sm font-bold ${isFeriado ? 'text-red-500' : isFds ? 'text-slate-400' : 'text-slate-700'}`}>{day}</span>
                    )}
                </div>
                {isFeriado && <Tooltip title={feriado || 'Feriado'}><Tag color="red" className="!m-0 !text-[8px] !px-1 font-bold">FER</Tag></Tooltip>}
            </div>
            <div className="space-y-1">
                {hasArm && (
                    <div>
                        {viewMode === 'geral' && <div className="flex items-center gap-0.5 mb-0.5"><HomeOutlined className="text-[8px] text-amber-600" /><span className="text-[8px] font-bold text-amber-700 uppercase">Arm</span></div>}
                        <div className="flex flex-wrap gap-0.5">
                            {Object.entries(armGrouped).map(([turno, eqs]) => (
                                <TurnoBadge key={`arm-${turno}`} sigla={turno} equipas={eqs} showEquipas size="xs" />
                            ))}
                        </div>
                    </div>
                )}
                {hasProd && (
                    <div>
                        {viewMode === 'geral' && hasArm && <Divider className="!my-0.5" />}
                        {viewMode === 'geral' && <div className="flex items-center gap-0.5 mb-0.5"><ToolOutlined className="text-[8px] text-blue-600" /><span className="text-[8px] font-bold text-blue-700 uppercase">Prod</span></div>}
                        <div className="flex flex-wrap gap-0.5">
                            {Object.entries(prodGrouped).map(([turno, eqs]) => (
                                <TurnoBadge key={`prod-${turno}`} sigla={turno} equipas={eqs} showEquipas size="xs" />
                            ))}
                        </div>
                    </div>
                )}
                {hasGer && (
                    <div>
                        {viewMode === 'geral' && (hasArm || hasProd) && <Divider className="!my-0.5" />}
                        {viewMode === 'geral' && <div className="flex items-center gap-0.5 mb-0.5"><ClockCircleOutlined className="text-[8px] text-amber-500" /><span className="text-[8px] font-bold text-amber-600 uppercase">GER</span></div>}
                        <div className="flex flex-wrap gap-0.5">
                            {(() => {
                                const g = {};
                                gerList.forEach(c => { if (!g[c.turno_sigla]) g[c.turno_sigla] = []; g[c.turno_sigla].push(c.dep); });
                                return Object.entries(g).map(([sigla, deps]) => {
                                    const count = gerList.filter(c => c.turno_sigla === sigla).length;
                                    return (
                                        <Tooltip key={sigla} title={
                                            <div className="text-xs">
                                                <div className="font-bold mb-1">GER — {TURNO_CFG[sigla]?.hours || '09:00–18:00'}</div>
                                                {sigla === 'GER' && <div className="text-amber-300"><CoffeeOutlined /> 13:00–14:00</div>}
                                                <div className="mt-1">Deps: {[...new Set(deps)].join(', ')}</div>
                                            </div>
                                        }>
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg cursor-default shadow-sm hover:scale-105 transition-transform"
                                                 style={{ background: TURNO_CFG[sigla]?.bg || TURNO_CFG.GER.bg }}>
                                                <span className="text-white text-[9px] font-bold">{sigla}</span>
                                                <span className="text-white/80 text-[8px] font-semibold">×{count}</span>
                                            </div>
                                        </Tooltip>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}
                {!hasAny && <div className="text-center py-2 sm:py-4"><Text className="text-[10px] text-gray-300">Sem turnos</Text></div>}
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function TurnosHorario() {
    const { auth } = useContext(AppContext);
    const [api, contextHolder] = notification.useNotification();

    const [loading,       setLoading]       = useState(false);
    const [escalasData,   setEscalasData]   = useState([]);
    const [feriasDatas,   setFeriasDatas]   = useState(new Set()); // datas de férias aprovadas
    const [userInfo,      setUserInfo]      = useState(null);
    const [currentMonth,  setCurrentMonth]  = useState(dayjs());
    const [viewMode,      setViewMode]      = useState('geral');
    const [equipasFiltro, setEquipasFiltro] = useState(['A','B','C','D','E']);

    // Resolver o número do colaborador — tenta todos os campos possíveis do auth
    const numColaborador = useMemo(() =>
        auth?.num || auth?.numero || auth?.nfunc || auth?.employee_id || null
    , [auth]);

    // Resolver tp_hor — vem do auth diretamente (JWT) como fallback
    const tpHorAuth = useMemo(() =>
        auth?.tp_hor || auth?.CALENDARIO || ''
    , [auth]);

    const load = useCallback(async () => {
        if (!numColaborador) {
            console.warn('[TurnosHorario] sem numColaborador, auth:', auth);
            return;
        }
        setLoading(true);
        const start = currentMonth.startOf('month').format('YYYY-MM-DD');
        const end   = currentMonth.endOf('month').format('YYYY-MM-DD');
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: {
                    method:      'GetTurnosColaborador',
                    data_inicio: start,
                    data_fim:    end,
                },
                filter: {
                    num:        numColaborador,
                    isRH:       auth?.isRH    || false,
                    isChefe:    auth?.isChefe  || false,
                    deps_chefe: auth?.deps_chefe || [],
                    isAdmin:    auth?.isAdmin  || false,
                }
            });

            if (r?.data?.success || r?.data?.status === 'success') {
                setEscalasData(r.data.escalas || []);

                // ── Férias vindas do backend ────────────────────────────
                // O backend inclui `ferias_datas` como array de strings "YYYY-MM-DD"
                // quando o campo existe; senão percorremos as escalas à procura de is_ferias
                if (Array.isArray(r.data.ferias_datas)) {
                    setFeriasDatas(new Set(r.data.ferias_datas));
                } else {
                    // fallback: extrair is_ferias das próprias escalas
                    const fSet = new Set();
                    (r.data.escalas || []).forEach(dia => {
                        const todasFerias = (dia.equipas || []).some(e => e.is_ferias);
                        const gerFerias   = (dia.ger     || []).some(g => g.is_ferias);
                        if (todasFerias || gerFerias) fSet.add(dia.data);
                    });
                    setFeriasDatas(fSet);
                }

                setUserInfo(r.data.user_info || {
                    role:       auth?.isRH    ? 'rh'
                            : auth?.isChefe ? 'chefe'
                            : 'colaborador',
                    // Usar tp_hor do backend se disponível, senão do JWT
                    tp_hor:     r.data.user_info?.tp_hor || tpHorAuth,
                    dep:        auth?.dep        || '',
                    deps_chefe: auth?.deps_chefe || [],
                });
            } else {
                throw new Error(r?.data?.error || r?.data?.title || 'Resposta inválida');
            }
        } catch (e) {
            api.error({ message: 'Erro ao carregar turnos', description: e.message, duration: 4, placement: 'topRight' });
        } finally {
            setLoading(false);
        }
    }, [currentMonth, numColaborador, auth?.isRH, auth?.isChefe, tpHorAuth]);

    useEffect(() => { load(); }, [load]);

    const role    = userInfo?.role || 'colaborador';
    const isRH    = role === 'rh';
    const isChefe = role === 'chefe';
    const isColab = role === 'colaborador';

    // tp_hor: preferência ao backend, depois JWT
    const tpHor   = userInfo?.tp_hor || tpHorAuth || '';
    const isGer      = isColab && tpHor === 'GER';
    const isRotativo = isColab && ['A','B','C','D','E'].includes(tpHor);

    const escalasPorData = useMemo(() => {
        const m = {};
        escalasData.forEach(d => { m[d.data] = d; });
        return m;
    }, [escalasData]);

    const toggleEquipa = (eq) => {
        setEquipasFiltro(prev => {
            if (prev.includes(eq)) {
                if (prev.length === 1) { api.warning({ message: 'Selecione pelo menos uma equipa', duration: 2 }); return prev; }
                return prev.filter(e => e !== eq);
            }
            return [...prev, eq].sort();
        });
    };

    const viewOptions = useMemo(() => {
        if (!isRH && !isChefe) return [];
        return [
            { label: 'Geral',    value: 'geral'    },
            { label: 'Armazém',  value: 'armazem'  },
            { label: 'Produção', value: 'producao' },
            { label: 'GER',      value: 'ger'      },
        ];
    }, [isRH, isChefe]);

    // Resumo mensal do colaborador
    const resumo = useMemo(() => {
        if (!isColab) return null;
        let trabalho = 0, ferias = 0, trocas = 0, folgas = 0;
        escalasData.forEach(dia => {
            if (dia.is_fds) return;

            // Se o dia está marcado como férias (backend ou set local)
            if (feriasDatas.has(dia.data)) { ferias++; return; }

            let item = null;
            if (isRotativo) {
                item = (dia.equipas || []).find(e => e.equipa === tpHor);
            } else if (isGer) {
                item = (dia.ger || [])[0];
            }

            if (!item) { folgas++; return; }

            const s = item.turno_sigla;
            if (s === 'FER' || item.is_ferias) ferias++;
            else if (s === 'DSC')              folgas++;
            else { trabalho++; if (item.is_troca) trocas++; }
        });
        return { trabalho, ferias, trocas, folgas };
    }, [escalasData, feriasDatas, isColab, isRotativo, isGer, tpHor]);

    const renderCalendar = () => {
        const startOfMonth = currentMonth.startOf('month');
        const daysInMonth  = currentMonth.daysInMonth();
        const offset       = startOfMonth.isoWeekday() - 1;
        const today        = dayjs().format('YYYY-MM-DD');
        const cells        = [];

        // Dias do mês anterior (padding)
        for (let i = offset - 1; i >= 0; i--) {
            const d = startOfMonth.subtract(i + 1, 'day');
            cells.push(
                <div key={`prev-${i}`} className="min-h-[100px] sm:min-h-[120px] bg-gray-50 border border-gray-100 p-1.5 opacity-40">
                    <span className="text-xs text-gray-300">{d.date()}</span>
                </div>
            );
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = startOfMonth.date(day).format('YYYY-MM-DD');
            const isToday = today === dateStr;
            const dayData = escalasPorData[dateStr];
            const isoWd   = startOfMonth.date(day).isoWeekday();
            const isFds   = isoWd >= 6;

            // Verificar se este dia tem férias aprovadas
            const isDiaFerias = feriasDatas.has(dateStr);

            const dayDataF = dayData ? {
                ...dayData,
                equipas: (dayData.equipas || []).filter(e => equipasFiltro.includes(e.equipa))
            } : null;

            if (isColab) {
                let turnoInfo = null;

                // ── Férias têm prioridade absoluta ─────────────────────
                if (isDiaFerias) {
                    turnoInfo = { turno_sigla: 'FER', is_ferias: true };
                } else if (isGer) {
                    // GER: procura o item pelo num do colaborador
                    const gerData = (dayData?.ger || []).find(g => g.num === numColaborador)
                                 || (dayData?.ger || [])[0];

                    if (gerData) {
                        if (gerData.is_ferias) {
                            turnoInfo = { turno_sigla: 'FER', is_ferias: true };
                        } else {
                            const { hora_inicio, hora_fim } = resolverHoras(
                                gerData.turno_sigla,
                                gerData.hora_inicio,
                                gerData.hora_fim
                            );
                            turnoInfo = { ...gerData, hora_inicio, hora_fim };
                        }
                    } else {
                        // Sem dados para este dia — se for fim de semana é DSC, senão GER padrão
                        turnoInfo = isFds
                            ? { turno_sigla: 'DSC' }
                            : {
                                turno_sigla: 'GER',
                                hora_inicio: '09:00',
                                hora_fim:    '18:00',
                                almoco_ini:  '13:00',
                                almoco_fim:  '14:00'
                              };
                    }

                } else if (isRotativo) {
                    // Rotativo: procura a equipa correta
                    const equipaData = (dayData?.equipas || []).find(e => e.equipa === tpHor);

                    if (equipaData) {
                        if (equipaData.is_ferias) {
                            turnoInfo = { turno_sigla: 'FER', is_ferias: true };
                        } else {
                            const { hora_inicio, hora_fim } = resolverHoras(
                                equipaData.turno_sigla,
                                equipaData.hora_inicio,
                                equipaData.hora_fim
                            );
                            turnoInfo = { ...equipaData, hora_inicio, hora_fim };
                        }
                    } else {
                        // Sem dados no ciclo para este dia = folga/descanso
                        turnoInfo = { turno_sigla: 'DSC' };
                    }
                } else {
                    turnoInfo = { turno_sigla: 'DSC' };
                }

                cells.push(
                    <CelulaDiaColab
                        key={dateStr}
                        day={day}
                        turnoInfo={turnoInfo}
                        isFds={isFds}
                        isToday={isToday}
                    />
                );
            } else {
                cells.push(
                    <CelulaDiaCompleta
                        key={dateStr}
                        day={day}
                        dayData={dayDataF ? { ...dayDataF, is_fds: isFds } : { is_fds: isFds, equipas: [], ger: [] }}
                        isToday={isToday}
                        viewMode={viewMode}
                    />
                );
            }
        }

        // Completar grelha para múltiplo de 7
        const rem = Math.ceil(cells.length / 7) * 7 - cells.length;
        for (let i = 1; i <= rem; i++) {
            cells.push(
                <div key={`next-${i}`} className="min-h-[100px] sm:min-h-[120px] bg-gray-50 border border-gray-100 p-1.5 opacity-40">
                    <span className="text-xs text-gray-300">{i}</span>
                </div>
            );
        }
        return cells;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 p-2 sm:p-4 md:p-6">
            {contextHolder}
            <div className="max-w-[1920px] mx-auto space-y-3 sm:space-y-4">

                {/* ── Header ── */}
                <Card className="shadow-xl border-0 overflow-hidden" bodyStyle={{ padding: 0 }}>
                    <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <div className="p-3 sm:p-5">
                        <div className="flex flex-col gap-3 sm:gap-4">

                            {/* Título + navegação */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <CalendarOutlined className="text-white text-lg sm:text-xl" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h1 className="text-base sm:text-xl font-black text-slate-800 capitalize">
                                                {currentMonth.format('MMMM YYYY')}
                                            </h1>
                                            {userInfo && <RoleBadge role={role} />}
                                            {isColab && tpHor && <TurnoBadge sigla={tpHor} />}
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                                            {isRH    ? 'Visão completa — todos os horários'
                                            : isChefe ? `Departamento(s): ${userInfo?.deps_chefe?.join(', ') || '—'}`
                                            : `O meu horário — ${auth?.first_name || numColaborador || ''}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button type="text" size="small" icon={<LeftOutlined />}  className="hover:!bg-indigo-50" onClick={() => setCurrentMonth(m => m.subtract(1, 'month'))} />
                                    <Button type="primary" size="small" className="!bg-indigo-500 hover:!bg-indigo-600 !border-0 !shadow-md !text-xs font-bold" onClick={() => setCurrentMonth(dayjs())}>Hoje</Button>
                                    <Button type="text" size="small" icon={<RightOutlined />}  className="hover:!bg-indigo-50" onClick={() => setCurrentMonth(m => m.add(1, 'month'))} />
                                </div>
                            </div>

                            {/* Filtros RH/Chefe */}
                            {(isRH || isChefe) && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 overflow-x-auto pb-1">
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Text className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Vista:</Text>
                                        <Segmented options={viewOptions} value={viewMode} onChange={setViewMode} size="small" className="!text-xs" />
                                    </div>
                                    <Divider type="vertical" className="!h-6 hidden sm:block" />
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Text className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Equipas:</Text>
                                        <Space size={2}>
                                            {['A','B','C','D','E'].map(eq => (
                                                <div key={eq} onClick={() => toggleEquipa(eq)}
                                                     className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold cursor-pointer transition-all
                                                         ${equipasFiltro.includes(eq) ? 'shadow-lg scale-105' : 'opacity-40 hover:opacity-70'}`}
                                                     style={{ backgroundColor: equipasFiltro.includes(eq) ? EQUIPA_CFG[eq]?.bg : '#E5E7EB', color: equipasFiltro.includes(eq) ? '#FFF' : '#9CA3AF' }}>
                                                    {eq}
                                                </div>
                                            ))}
                                        </Space>
                                    </div>
                                </div>
                            )}

                            {/* Info colaborador rotativo */}
                            {isRotativo && (
                                <div className="pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                                        <TeamOutlined className="text-indigo-400" />
                                        <span>Equipa <strong>{tpHor}</strong></span>
                                        <span>·</span>
                                        <span>Departamento: <strong>{userInfo?.dep || auth?.dep || '—'}</strong></span>
                                    </div>
                                    {resumo && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {[
                                                { label: 'Trabalho', value: resumo.trabalho, color: '#059669', bg: '#ECFDF5' },
                                                { label: 'Férias',   value: resumo.ferias,   color: '#7E22CE', bg: '#FAF5FF' },
                                                { label: 'Trocas',   value: resumo.trocas,   color: '#2563EB', bg: '#EFF6FF' },
                                                { label: 'Folgas',   value: resumo.folgas,   color: '#6B7280', bg: '#F3F4F6' },
                                            ].map(item => (
                                                <div key={item.label}
                                                     style={{ background: item.bg }}
                                                     className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-100">
                                                    <span style={{ color: item.color }} className="text-base font-black leading-none">{item.value}</span>
                                                    <span className="text-[10px] text-slate-500 font-semibold uppercase">{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Info GER */}
                            {isGer && (
                                <div className="pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500"><ClockCircleOutlined className="text-amber-400" /><span>Entrada: <strong>09:00</strong> (±15 min)</span></div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500"><CoffeeOutlined className="text-amber-400" /><span>Almoço: <strong>13:00–14:00</strong></span></div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500"><ClockCircleOutlined className="text-red-400" /><span>Saída: <strong>18:00</strong></span></div>
                                        {resumo && <span className="text-xs text-purple-600 font-semibold">· {resumo.ferias} dias férias</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* ── Calendário ── */}
                <Spin spinning={loading} tip="A carregar turnos..." size="large">
                    <Card className="shadow-xl border-0 overflow-hidden" bodyStyle={{ padding: 0 }}>
                        <div className="overflow-x-auto">
                            <div className="min-w-[600px] sm:min-w-[700px]">
                                <div className="grid grid-cols-7 bg-gradient-to-r from-slate-700 to-slate-800 sticky top-0 z-10">
                                    {DIAS_SEMANA.map((d, i) => (
                                        <div key={d} className={`py-2 sm:py-3 text-center ${i >= 5 ? 'bg-slate-600/30' : ''}`}>
                                            <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">{d}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7">{renderCalendar()}</div>
                            </div>
                        </div>
                        <div className="sm:hidden text-center py-2 text-[10px] text-slate-400">← Deslize para ver todos os dias →</div>
                    </Card>
                </Spin>

                {/* ── Legenda ── */}
                <Card className="shadow-lg border-0" bodyStyle={{ padding: '12px 16px' }}>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <Text className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase flex-shrink-0">Turnos:</Text>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {Object.entries(TURNO_CFG).map(([k, cfg]) => (
                                    <div key={k} className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center shadow-sm" style={{ background: cfg.bg }}>
                                            <span className="text-[8px] sm:text-[10px] text-white font-bold">{k}</span>
                                        </div>
                                        <span className="text-[10px] sm:text-xs text-gray-500">{cfg.label}</span>
                                        {cfg.hours && <span className="text-[9px] text-gray-300 hidden sm:inline">({cfg.hours})</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        {(isRH || isChefe) && (
                            <>
                                <Divider className="!my-1" />
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <Text className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase flex-shrink-0">Equipas:</Text>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {Object.entries(EQUIPA_CFG).map(([eq, c]) => (
                                            <div key={eq} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-sm" style={{ backgroundColor: c.bg, color: c.text }}>{eq}</div>
                                        ))}
                                        <span className="text-[10px] text-slate-400 ml-1">A–E = equipas rotativas · GER = horário fixo · ×N = nº de pessoas</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Card>

            </div>
        </div>
    );
}