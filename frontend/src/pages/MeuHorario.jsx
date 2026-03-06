import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    Button, Tag, Tooltip, Spin, Segmented, Divider,
    Badge, Space, Empty, Card
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

/* ── Configuração de turnos ──────────────────────────── */
const TURNO_CFG = {
    NOI: {
        bg:    'linear-gradient(135deg,#1e3a5f,#2d5a87)',
        light: '#EFF6FF', border: '#3B82F6', text: '#1E40AF',
        label: 'Noite',   hours: '00:00–08:00'
    },
    MAN: {
        bg:    'linear-gradient(135deg,#059669,#10B981)',
        light: '#ECFDF5', border: '#10B981', text: '#047857',
        label: 'Manhã',   hours: '08:00–16:00'
    },
    TAR: {
        bg:    'linear-gradient(135deg,#D97706,#F59E0B)',
        light: '#FEF3C7', border: '#F59E0B', text: '#B45309',
        label: 'Tarde',   hours: '16:00–00:00'
    },
    GER: {
        bg:    'linear-gradient(135deg,#B45309,#F59E0B)',
        light: '#FFFBEB', border: '#F59E0B', text: '#92400E',
        label: 'Geral',   hours: '09:00–18:00'
    },
    DSC: {
        bg:    'linear-gradient(135deg,#6B7280,#9CA3AF)',
        light: '#F3F4F6', border: '#D1D5DB', text: '#4B5563',
        label: 'Descanso', hours: null
    },
    REF: {
        bg:    'linear-gradient(135deg,#7C3AED,#8B5CF6)',
        light: '#F5F3FF', border: '#A78BFA', text: '#6D28D9',
        label: 'Reforço', hours: 'Variável'
    },
    FER: {
        bg:    'linear-gradient(135deg,#DC2626,#EF4444)',
        light: '#FEF2F2', border: '#F87171', text: '#B91C1C',
        label: 'Férias',  hours: null
    },
};

const EQUIPA_CFG = {
    A: { bg: '#3B82F6', text: '#FFF' },
    B: { bg: '#10B981', text: '#FFF' },
    C: { bg: '#F59E0B', text: '#FFF' },
    D: { bg: '#EF4444', text: '#FFF' },
    E: { bg: '#8B5CF6', text: '#FFF' },
};

const DIAS_ABREV = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/* ── Badge de papel ──────────────────────────────────── */
const RoleBadge = ({ role }) => {
    const cfg = {
        rh:          { icon: <SafetyOutlined />,  color: 'purple', label: 'Recursos Humanos' },
        chefe:       { icon: <CrownOutlined />,   color: 'gold',   label: 'Chefe de Departamento' },
        colaborador: { icon: <UserOutlined />,    color: 'blue',   label: 'Colaborador'  },
    };
    const c = cfg[role] || cfg.colaborador;
    return (
        <Tag icon={c.icon} color={c.color}
             className="font-semibold text-xs px-2 py-0.5">
            {c.label}
        </Tag>
    );
};

/* ── Badge de turno compacto ─────────────────────────── */
const TurnoBadge = ({ sigla, equipas = [], showEquipas = false, size = 'sm' }) => {
    const cfg  = TURNO_CFG[sigla] || TURNO_CFG.DSC;
    const base = size === 'xs'
        ? 'px-1.5 py-0.5 text-[9px]'
        : 'px-2 py-1 text-[10px]';

    return (
        <Tooltip title={
            <div className="p-1">
                <div className="font-bold mb-0.5">{cfg.label}</div>
                {cfg.hours && (
                    <div className="text-xs text-gray-300 flex items-center gap-1">
                        <ClockCircleOutlined /> {cfg.hours}
                    </div>
                )}
                {sigla === 'GER' && (
                    <div className="text-xs text-amber-300 mt-0.5">
                        <CoffeeOutlined /> Almoço: 13:00–14:00
                    </div>
                )}
                {showEquipas && equipas.length > 0 && (
                    <div className="text-xs mt-0.5">
                        Equipas: {equipas.join(', ')}
                    </div>
                )}
            </div>
        } placement="top">
            <div className={`inline-flex items-center gap-1 rounded-lg
                             font-bold cursor-default shadow-sm
                             transition-transform hover:scale-105 ${base}`}
                 style={{ background: cfg.bg }}>
                <span className="text-white">{sigla}</span>
                {showEquipas && equipas.length > 0 && (
                    <div className="flex -space-x-1">
                        {equipas.map(eq => (
                            <div key={eq}
                                 className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full
                                            flex items-center justify-center
                                            text-[7px] sm:text-[8px] font-black
                                            border border-white shadow-sm"
                                 style={{
                                     backgroundColor: EQUIPA_CFG[eq]?.bg || '#64748b',
                                     color: '#fff'
                                 }}>
                                {eq}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Tooltip>
    );
};

/* ── Célula do dia (colaborador GER) ─────────────────── */
const CelulaDiaGer = ({ day, dayData, isToday }) => {
    const ger = dayData?.ger?.[0];
    const sigla = ger?.turno_sigla || (dayData?.is_fds ? 'DSC' : 'GER');
    const cfg   = TURNO_CFG[sigla] || TURNO_CFG.DSC;

    return (
        <div className={`min-h-[100px] sm:min-h-[120px] p-2 border transition-all
            ${isToday
                ? 'ring-2 ring-indigo-500 bg-indigo-50'
                : dayData?.is_fds
                    ? 'bg-slate-50'
                    : 'bg-white'
            }
            ${isToday ? 'border-indigo-300' : 'border-gray-200'}
            hover:shadow-md hover:z-10`}>

            {/* Número do dia */}
            <div className="flex items-start justify-between mb-1.5">
                {isToday ? (
                    <Badge count="HOJE" size="small"
                           style={{ backgroundColor: '#4F46E5', fontSize: '8px' }}>
                        <div className="w-6 h-6 sm:w-7 sm:h-7 bg-indigo-500
                                        rounded-lg flex items-center justify-center
                                        text-white font-black text-xs shadow">
                            {day}
                        </div>
                    </Badge>
                ) : (
                    <span className={`text-sm sm:text-base font-bold
                        ${dayData?.is_fds ? 'text-slate-400' : 'text-slate-700'}`}>
                        {day}
                    </span>
                )}
            </div>

            {/* Turno */}
            <div className="flex flex-col gap-1">
                {sigla !== 'DSC' ? (
                    <div className={`rounded-lg p-1.5 border`}
                         style={{
                             backgroundColor: cfg.light,
                             borderColor:      cfg.border
                         }}>
                        <div className="flex items-center gap-1 mb-0.5">
                            <div className="w-4 h-4 rounded-md flex items-center
                                            justify-center text-white text-[8px]
                                            font-black"
                                 style={{ background: cfg.bg }}>
                                {sigla}
                            </div>
                            <span className="text-[9px] font-bold"
                                  style={{ color: cfg.text }}>
                                {cfg.label}
                            </span>
                        </div>
                        {ger?.hora_inicio && (
                            <div className="text-[9px] text-slate-500 flex items-center gap-0.5">
                                <ClockCircleOutlined className="text-[8px]" />
                                {ger.hora_inicio}–{ger.hora_fim}
                            </div>
                        )}
                        {ger?.almoco_ini && (
                            <div className="text-[8px] text-amber-500 flex items-center gap-0.5">
                                <CoffeeOutlined className="text-[8px]" />
                                {ger.almoco_ini}–{ger.almoco_fim}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-2">
                        <span className="text-[10px] text-slate-300 font-medium">
                            {dayData?.is_fds ? 'Fim de semana' : 'Folga'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── Célula do dia (RH / Chefe — visão completa) ─────── */
const CelulaDiaCompleta = ({ day, dayData, isToday, viewMode }) => {
    if (!dayData) return (
        <div className="min-h-[120px] bg-gray-50 border border-gray-100 p-1.5">
            <span className="text-xs text-gray-300">{day}</span>
        </div>
    );

    const isFeriado  = dayData.equipas?.some(e => e.is_feriado);
    const feriado    = dayData.equipas?.find(e => e.nome_feriado)?.nome_feriado;

    // Agrupar equipas rotativos por turno
    const groupByTurno = (equipas) => {
        const g = {};
        (equipas || []).forEach(eq => {
            const k = eq.turno_sigla;
            if (!g[k]) g[k] = [];
            g[k].push(eq.equipa);
        });
        return g;
    };

    const armazem  = (dayData.equipas || []).filter(e => e.esquema === 'Armazem');
    const producao = (dayData.equipas || []).filter(e => e.esquema !== 'Armazem'
                                                      && e.esquema !== undefined);
    const gerList  = dayData.ger || [];

    const showArm  = viewMode === 'geral' || viewMode === 'armazem';
    const showProd = viewMode === 'geral' || viewMode === 'producao';
    const showGer  = viewMode === 'geral' || viewMode === 'ger';

    const armGrouped  = groupByTurno(armazem);
    const prodGrouped = groupByTurno(producao);
    // GER — agrupar por turno_sigla
    const gerGrouped  = groupByTurno(
        gerList.map(g => ({ ...g, equipa: g.dep }))
    );

    return (
        <div className={`min-h-[120px] sm:min-h-[140px] p-1.5 border transition-all
            relative hover:shadow-xl hover:z-10
            ${isToday   ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50'  : 'bg-white'}
            ${isFeriado ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200' : 'border-gray-200'}
            ${dayData.is_fds && !isFeriado && !isToday ? 'bg-slate-50' : ''}
        `}>
            {/* Header do dia */}
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1">
                    {isToday ? (
                        <Badge count="HOJE" size="small"
                               style={{ backgroundColor: '#4F46E5', fontSize: '7px' }}>
                            <div className="w-6 h-6 bg-indigo-500 rounded-lg
                                            flex items-center justify-center
                                            text-white font-black text-xs shadow">
                                {day}
                            </div>
                        </Badge>
                    ) : (
                        <span className={`text-sm font-bold
                            ${isFeriado    ? 'text-red-500'
                              : dayData.is_fds ? 'text-slate-400'
                              : 'text-slate-700'}`}>
                            {day}
                        </span>
                    )}
                </div>
                {isFeriado && (
                    <Tooltip title={feriado || 'Feriado'}>
                        <Tag color="red" className="!m-0 !text-[8px] !px-1 font-bold">
                            FER
                        </Tag>
                    </Tooltip>
                )}
            </div>

            {/* Conteúdo */}
            <div className="space-y-1">
                {/* Armazém */}
                {showArm && Object.keys(armGrouped).length > 0 && (
                    <div>
                        {viewMode === 'geral' && (
                            <div className="flex items-center gap-0.5 mb-0.5">
                                <HomeOutlined className="text-[8px] text-amber-600" />
                                <span className="text-[8px] font-bold text-amber-700 uppercase">
                                    Arm
                                </span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-0.5">
                            {Object.entries(armGrouped).map(([turno, eqs]) => (
                                <TurnoBadge key={`arm-${turno}`}
                                            sigla={turno}
                                            equipas={eqs}
                                            showEquipas
                                            size="xs" />
                            ))}
                        </div>
                    </div>
                )}

                {/* Produção */}
                {showProd && Object.keys(prodGrouped).length > 0 && (
                    <div>
                        {viewMode === 'geral' && Object.keys(armGrouped).length > 0 && (
                            <Divider className="!my-0.5" />
                        )}
                        {viewMode === 'geral' && (
                            <div className="flex items-center gap-0.5 mb-0.5">
                                <ToolOutlined className="text-[8px] text-blue-600" />
                                <span className="text-[8px] font-bold text-blue-700 uppercase">
                                    Prod
                                </span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-0.5">
                            {Object.entries(prodGrouped).map(([turno, eqs]) => (
                                <TurnoBadge key={`prod-${turno}`}
                                            sigla={turno}
                                            equipas={eqs}
                                            showEquipas
                                            size="xs" />
                            ))}
                        </div>
                    </div>
                )}

                {/* GER */}
                {showGer && gerList.length > 0 && (
                    <div>
                        {viewMode === 'geral' &&
                         (Object.keys(armGrouped).length > 0 ||
                          Object.keys(prodGrouped).length > 0) && (
                            <Divider className="!my-0.5" />
                        )}
                        {viewMode === 'geral' && (
                            <div className="flex items-center gap-0.5 mb-0.5">
                                <ClockCircleOutlined className="text-[8px] text-amber-500" />
                                <span className="text-[8px] font-bold text-amber-600 uppercase">
                                    GER
                                </span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-0.5">
                            {/* Agrupar GER por turno_sigla */}
                            {(() => {
                                const g = {};
                                gerList.forEach(c => {
                                    if (!g[c.turno_sigla]) g[c.turno_sigla] = [];
                                    g[c.turno_sigla].push(c.dep);
                                });
                                return Object.entries(g).map(([sigla, deps]) => (
                                    <Tooltip key={sigla}
                                             title={
                                                <div className="text-xs">
                                                    <div className="font-bold mb-1">
                                                        GER — {sigla === 'GER'
                                                            ? '09:00–18:00'
                                                            : 'Folga'}
                                                    </div>
                                                    {sigla === 'GER' && (
                                                        <div className="text-amber-300">
                                                            <CoffeeOutlined /> 13:00–14:00
                                                        </div>
                                                    )}
                                                    <div className="mt-1">
                                                        Deps: {[...new Set(deps)].join(', ')}
                                                    </div>
                                                </div>
                                             }>
                                        <div className="flex items-center gap-1
                                                        px-1.5 py-0.5 rounded-lg
                                                        cursor-default shadow-sm
                                                        hover:scale-105 transition-transform"
                                             style={{
                                                 background: TURNO_CFG[sigla]?.bg
                                                           || TURNO_CFG.GER.bg
                                             }}>
                                            <span className="text-white text-[9px] font-bold">
                                                {sigla}
                                            </span>
                                            <span className="text-white/80 text-[8px] font-semibold">
                                                ×{gerList.filter(c => c.turno_sigla === sigla).length}
                                            </span>
                                        </div>
                                    </Tooltip>
                                ));
                            })()}
                        </div>
                    </div>
                )}

                {/* Sem dados */}
                {Object.keys(armGrouped).length === 0 &&
                 Object.keys(prodGrouped).length === 0 &&
                 gerList.length === 0 && (
                    <div className="text-center py-3">
                        <span className="text-[9px] text-gray-300">—</span>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════ */
export default function MeuHorario() {
    const { auth } = useContext(AppContext);

    const [loading,      setLoading]      = useState(false);
    const [escalasData,  setEscalasData]  = useState([]);
    const [userInfo,     setUserInfo]     = useState(null);
    const [currentMonth, setCurrentMonth] = useState(dayjs());
    const [viewMode,     setViewMode]     = useState('geral');
    const [equipasFiltro, setEquipasFiltro] = useState(['A','B','C','D','E']);

    const load = useCallback(async () => {
        if (!auth?.num) return;
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
                    num:     auth.num,
                    isRH:    auth.isRH    || false,
                    isAdmin: auth.isAdmin || false,
                }
            });

            if (r.data?.success) {
                setEscalasData(r.data.escalas || []);
                setUserInfo(r.data.user_info  || null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [currentMonth, auth]);

    useEffect(() => { load(); }, [currentMonth]);

    // Indexar por data para acesso O(1)
    const escalasPorData = React.useMemo(() => {
        const m = {};
        escalasData.forEach(d => { m[d.data] = d; });
        return m;
    }, [escalasData]);

    const role       = userInfo?.role || 'colaborador';
    const isRH       = role === 'rh';
    const isChefe    = role === 'chefe';
    const isColab    = role === 'colaborador';
    const tpHor      = userInfo?.tp_hor || '';
    const isGerColab = isColab && tpHor === 'GER';
    const isRotativo = isColab && ['A','B','C','D','E'].includes(tpHor);

    /* ── Renderizar grelha do calendário ─────────────── */
    const renderCalendar = () => {
        const startOfMonth  = currentMonth.startOf('month');
        const daysInMonth   = currentMonth.daysInMonth();
        const firstWeekday  = startOfMonth.isoWeekday(); // 1=Seg
        const offset        = firstWeekday - 1;
        const today         = dayjs().format('YYYY-MM-DD');
        const cells         = [];

        // Dias do mês anterior (vazios)
        for (let i = offset - 1; i >= 0; i--) {
            const d = startOfMonth.subtract(i + 1, 'day');
            cells.push(
                <div key={`prev-${i}`}
                     className="min-h-[100px] sm:min-h-[120px] bg-gray-50 p-1.5
                                border border-gray-100 opacity-40">
                    <span className="text-xs text-gray-300">{d.date()}</span>
                </div>
            );
        }

        // Dias do mês atual
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = startOfMonth.date(day).format('YYYY-MM-DD');
            const isToday = today === dateStr;
            const dayData = escalasPorData[dateStr];

            // Filtrar equipas se necessário
            const dayDataFiltrado = dayData ? {
                ...dayData,
                equipas: (dayData.equipas || []).filter(e =>
                    equipasFiltro.includes(e.equipa)
                )
            } : null;

            if (isColab) {
                if (isGerColab) {
                    cells.push(
                        <CelulaDiaGer key={dateStr}
                                      day={day}
                                      dayData={dayDataFiltrado}
                                      isToday={isToday} />
                    );
                } else if (isRotativo) {
                    // Colaborador rotativo — só vê a sua equipa
                    const minhaCelula = dayDataFiltrado ? {
                        ...dayDataFiltrado,
                        equipas: (dayDataFiltrado.equipas || [])
                                    .filter(e => e.equipa === tpHor)
                    } : null;
                    cells.push(
                        <CelulaDiaGer key={dateStr}
                                      day={day}
                                      dayData={minhaCelula
                                                ? {
                                                    ...minhaCelula,
                                                    ger: minhaCelula.equipas.map(e => ({
                                                        turno_sigla: e.turno_sigla,
                                                        turno_nome:  e.turno_nome,
                                                        hora_inicio: e.hora_inicio,
                                                        hora_fim:    e.hora_fim,
                                                        almoco_ini:  null,
                                                        cor_hex:     e.cor_hex,
                                                    }))
                                                  }
                                                : null}
                                      isToday={isToday} />
                    );
                } else {
                    cells.push(
                        <CelulaDiaGer key={dateStr}
                                      day={day}
                                      dayData={null}
                                      isToday={isToday} />
                    );
                }
            } else {
                // RH ou Chefe — visão completa
                cells.push(
                    <CelulaDiaCompleta key={dateStr}
                                       day={day}
                                       dayData={dayDataFiltrado}
                                       isToday={isToday}
                                       viewMode={viewMode} />
                );
            }
        }

        // Completar grelha
        const total    = cells.length;
        const rem      = Math.ceil(total / 7) * 7 - total;
        for (let i = 1; i <= rem; i++) {
            cells.push(
                <div key={`next-${i}`}
                     className="min-h-[100px] sm:min-h-[120px] bg-gray-50 p-1.5
                                border border-gray-100 opacity-40">
                    <span className="text-xs text-gray-300">{i}</span>
                </div>
            );
        }

        return cells;
    };

    /* ── Opções de vista conforme papel ──────────────── */
    const viewOptions = React.useMemo(() => {
        if (isRH || isChefe) {
            const opts = [{ label: 'Geral', value: 'geral' }];
            if (userInfo?.deps_chefe?.length > 0 || isRH) {
                opts.push(
                    { label: 'Armazém',  value: 'armazem'  },
                    { label: 'Produção', value: 'producao' },
                    { label: 'GER',      value: 'ger'      }
                );
            }
            return opts;
        }
        return [];
    }, [role, userInfo]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100
                        via-slate-50 to-indigo-50 p-2 sm:p-4">
            <div className="max-w-[1920px] mx-auto space-y-3">

                {/* ── Header ── */}
                <Card className="shadow-xl border-0 overflow-hidden"
                      bodyStyle={{ padding: 0 }}>
                    <div className="h-1 bg-gradient-to-r from-indigo-500
                                    via-purple-500 to-amber-500" />
                    <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row
                                        sm:items-center justify-between gap-3">

                            {/* Título + role */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12
                                                bg-gradient-to-br from-indigo-500
                                                to-purple-600 rounded-xl
                                                flex items-center justify-center shadow-lg">
                                    <CalendarOutlined className="text-white text-lg sm:text-xl" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-base sm:text-lg font-black
                                                       text-slate-800 capitalize">
                                            {currentMonth.format('MMMM YYYY')}
                                        </h1>
                                        {userInfo && <RoleBadge role={role} />}
                                        {isColab && tpHor && (
                                            <TurnoBadge sigla={tpHor} />
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {isRH
                                            ? 'Visão completa — todos os horários'
                                            : isChefe
                                                ? `Departamento(s): ${userInfo?.deps_chefe?.join(', ')}`
                                                : `O meu horário — ${auth?.first_name || auth?.num}`}
                                    </p>
                                </div>
                            </div>

                            {/* Navegação */}
                            <div className="flex items-center gap-1.5">
                                <Button type="text" size="small"
                                        icon={<LeftOutlined />}
                                        className="hover:!bg-indigo-50"
                                        onClick={() => setCurrentMonth(
                                            currentMonth.subtract(1, 'month')
                                        )} />
                                <Button type="primary" size="small"
                                        className="!bg-indigo-500 hover:!bg-indigo-600
                                                   !border-0 !shadow-md !text-xs font-bold"
                                        onClick={() => setCurrentMonth(dayjs())}>
                                    Hoje
                                </Button>
                                <Button type="text" size="small"
                                        icon={<RightOutlined />}
                                        className="hover:!bg-indigo-50"
                                        onClick={() => setCurrentMonth(
                                            currentMonth.add(1, 'month')
                                        )} />
                            </div>
                        </div>

                        {/* Filtros (RH / Chefe) */}
                        {(isRH || isChefe) && (
                            <div className="flex flex-wrap items-center
                                            gap-3 mt-3 pt-3 border-t border-slate-100">
                                {/* Vista */}
                                {viewOptions.length > 1 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold
                                                         text-slate-400 uppercase">
                                            Vista:
                                        </span>
                                        <Segmented
                                            options={viewOptions}
                                            value={viewMode}
                                            onChange={setViewMode}
                                            size="small"
                                            className="!text-xs" />
                                    </div>
                                )}

                                <Divider type="vertical" className="!h-5" />

                                {/* Equipas */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold
                                                     text-slate-400 uppercase">
                                        Equipas:
                                    </span>
                                    <Space size={4}>
                                        {['A','B','C','D','E'].map(eq => (
                                            <div key={eq}
                                                 onClick={() => {
                                                     setEquipasFiltro(prev =>
                                                         prev.includes(eq)
                                                             ? prev.length > 1
                                                                 ? prev.filter(e => e !== eq)
                                                                 : prev
                                                             : [...prev, eq].sort()
                                                     );
                                                 }}
                                                 className={`w-6 h-6 sm:w-7 sm:h-7
                                                    rounded-lg flex items-center
                                                    justify-center text-xs font-black
                                                    cursor-pointer transition-all
                                                    ${equipasFiltro.includes(eq)
                                                        ? 'shadow-md scale-105'
                                                        : 'opacity-35 hover:opacity-60'
                                                    }`}
                                                 style={{
                                                     backgroundColor:
                                                         equipasFiltro.includes(eq)
                                                             ? EQUIPA_CFG[eq]?.bg
                                                             : '#E5E7EB',
                                                     color:
                                                         equipasFiltro.includes(eq)
                                                             ? '#FFF'
                                                             : '#9CA3AF'
                                                 }}>
                                                {eq}
                                            </div>
                                        ))}
                                    </Space>
                                </div>
                            </div>
                        )}

                        {/* Info colaborador rotativo */}
                        {isRotativo && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2
                                                flex-wrap text-xs text-slate-500">
                                    <TeamOutlined className="text-indigo-400" />
                                    <span>Equipa <strong>{tpHor}</strong></span>
                                    <span>·</span>
                                    <span>Departamento: <strong>
                                        {userInfo?.dep || '—'}
                                    </strong></span>
                                </div>
                            </div>
                        )}

                        {/* Info colaborador GER */}
                        {isGerColab && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-1.5
                                                    text-xs text-slate-500">
                                        <ClockCircleOutlined className="text-amber-400" />
                                        <span>Entrada: <strong>09:00</strong>
                                            (±15 min)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5
                                                    text-xs text-slate-500">
                                        <CoffeeOutlined className="text-amber-400" />
                                        <span>Almoço: <strong>13:00–14:00</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5
                                                    text-xs text-slate-500">
                                        <ClockCircleOutlined className="text-red-400" />
                                        <span>Saída: <strong>18:00</strong></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* ── Calendário ── */}
                <Spin spinning={loading} tip="A carregar..." size="large">
                    <Card className="shadow-xl border-0 overflow-hidden"
                          bodyStyle={{ padding: 0 }}>
                        <div className="overflow-x-auto">
                            <div className="min-w-[600px]">
                                {/* Header dias da semana */}
                                <div className="grid grid-cols-7
                                                bg-gradient-to-r from-slate-700
                                                to-slate-800 sticky top-0 z-10">
                                    {DIAS_ABREV.slice(1).map((d, i) => (
                                        <div key={d}
                                             className={`py-2 text-center
                                                ${i >= 5 ? 'bg-slate-600/30' : ''}`}>
                                            <span className="text-[10px] sm:text-xs
                                                             font-bold text-white
                                                             uppercase tracking-wider">
                                                {d}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Grelha */}
                                <div className="grid grid-cols-7">
                                    {renderCalendar()}
                                </div>
                            </div>
                        </div>

                        {/* Hint mobile */}
                        <div className="sm:hidden text-center py-1.5
                                        text-[10px] text-slate-400 border-t">
                            ← Deslize para ver todos os dias →
                        </div>
                    </Card>
                </Spin>

                {/* ── Legenda ── */}
                <Card className="shadow-lg border-0"
                      bodyStyle={{ padding: '12px 16px' }}>
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black text-slate-500
                                             uppercase flex-shrink-0">
                                Turnos:
                            </span>
                            {Object.entries(TURNO_CFG)
                                .filter(([k]) => isRH || isChefe
                                    ? true
                                    : isGerColab
                                        ? ['GER','DSC'].includes(k)
                                        : true
                                )
                                .map(([k, cfg]) => (
                                    <div key={k}
                                         className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-md
                                                        flex items-center justify-center
                                                        shadow-sm"
                                             style={{ background: cfg.bg }}>
                                            <span className="text-[8px] text-white
                                                             font-black">{k}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500">
                                            {cfg.label}
                                        </span>
                                    </div>
                                ))}
                        </div>

                        {(isRH || isChefe) && (
                            <>
                                <Divider className="!my-1" />
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-black
                                                     text-slate-500 uppercase">
                                        Equipas:
                                    </span>
                                    {Object.entries(EQUIPA_CFG).map(([eq, c]) => (
                                        <div key={eq}
                                             className="w-5 h-5 rounded-full
                                                        flex items-center justify-center
                                                        text-[9px] font-black shadow-sm"
                                             style={{ backgroundColor: c.bg,
                                                      color: c.text }}>
                                            {eq}
                                        </div>
                                    ))}
                                    <span className="text-[10px] text-slate-400 ml-1">
                                        A–E = equipas rotativas ·
                                        GER = horário fixo ·
                                        número = quantidade de pessoas
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}