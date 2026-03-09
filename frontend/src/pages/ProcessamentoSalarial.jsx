import React, { useState, useContext, useCallback } from 'react';
import dayjs from 'dayjs';
import { DatePicker, Input, Select, Button, Drawer, Spin, Tag, Tooltip, Alert } from 'antd';
import {
    SearchOutlined, ClockCircleOutlined, UserOutlined,
    CalendarOutlined, WarningOutlined, CheckCircleOutlined,
    MoonOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { fetchPost } from 'utils/fetch';
import { API_URL, DATE_FORMAT } from 'config';
import { LayoutContext } from './GridLayout';
import YScroll from 'components/YScroll';

const { RangePicker } = DatePicker;

/* ── Helpers ─────────────────────────────────────────── */
const fmtHoras = (mins) => {
    if (!mins) return '0h 00m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
};

const tagTurno = (tp_hor) => {
    if (!tp_hor) return null;
    const cores = {
        'MAN': 'green', 'TAR': 'orange',
        'NOI': 'blue',  'DSC': 'default'
    };
    return (
        <Tag color={cores[tp_hor] || 'purple'} className="text-xs font-bold">
            {tp_hor}
        </Tag>
    );
};

/* ── Linha de dia no detalhe ─────────────────────────── */
const DiaRow = ({ dia }) => {
    const {
        data, dia_semana_abrev, is_fds, is_ferias, tipo_dia,
        tem_registo, n_picagens, horas_fmt, tem_erro,
        pausa_almoco, minutos_pausa, mins_noturnos,
        pares, picagens, tp_hor
    } = dia;

    // Determinar estilo visual da linha
    const rowCfg = (() => {
        if (is_fds)
            return {
                rowClass: 'bg-slate-50 opacity-60',
                badge: null,
                badgeClass: '',
                label: 'Fim de semana'
            };
        if (is_ferias && !tem_registo)
            return {
                rowClass: 'bg-purple-50/60',
                badge: '🌴',
                badgeClass: 'bg-purple-100 text-purple-700 border border-purple-200',
                label: 'Férias aprovadas'
            };
        if (is_ferias && tem_registo)
            return {
                rowClass: 'bg-purple-50/30',
                badge: '🌴',
                badgeClass: 'bg-purple-100 text-purple-700 border border-purple-200',
                label: 'Férias (c/ picagem)'
            };
        if (tem_erro)
            return {
                rowClass: 'bg-amber-50/50',
                badge: '⚠️',
                badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
                label: null
            };
        if (!tem_registo)
            return {
                rowClass: 'bg-red-50/40',
                badge: '❌',
                badgeClass: 'bg-red-100 text-red-700 border border-red-200',
                label: 'Falta'
            };
        return {
            rowClass: 'hover:bg-blue-50/20',
            badge: '✓',
            badgeClass: 'bg-green-100 text-green-700 border border-green-200',
            label: null
        };
    })();

    return (
        <div className={`px-4 py-3 flex items-start gap-3 border-b border-gray-100 ${rowCfg.rowClass}`}>

            {/* Data */}
            <div className="w-24 shrink-0">
                <div className="text-xs font-bold text-gray-400 uppercase">
                    {dia_semana_abrev}
                </div>
                <div className={`text-sm font-black ${is_fds ? 'text-slate-400' : 'text-slate-800'}`}>
                    {dayjs(data).format('DD/MM/YYYY')}
                </div>
            </div>

            {/* Badge de estado */}
            {rowCfg.badge && (
                <div className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${rowCfg.badgeClass}`}>
                    <span>{rowCfg.badge}</span>
                    {rowCfg.label && <span>{rowCfg.label}</span>}
                </div>
            )}

            {/* Conteúdo principal */}
            <div className="flex-1 min-w-0">
                {/* Dia de férias sem picagem */}
                {is_ferias && !tem_registo && !is_fds && (
                    <span className="text-xs text-purple-600 font-semibold italic">
                        Dia de férias aprovado pelo RH
                    </span>
                )}

                {/* Dia com picagens */}
                {tem_registo && (
                    <>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-blue-700">
                                {horas_fmt}
                            </span>
                            <span className="text-xs text-gray-400">
                                ({n_picagens} picagem{n_picagens !== 1 ? 's' : ''})
                            </span>
                            {mins_noturnos > 0 && (
                                <Tag color="blue" className="text-[10px]">
                                    <MoonOutlined className="mr-1" />
                                    {fmtHoras(mins_noturnos)} noturnas
                                </Tag>
                            )}
                            {pausa_almoco && (
                                <Tag color="green" className="text-[10px]">
                                    Pausa almoço {minutos_pausa}m
                                </Tag>
                            )}
                            {tem_erro && (
                                <Tag color="red" className="text-[10px]">
                                    <WarningOutlined /> Picagens inconsistentes
                                </Tag>
                            )}
                            {is_ferias && (
                                <Tag color="purple" className="text-[10px]">
                                    🌴 Férias
                                </Tag>
                            )}
                        </div>

                        {/* Pares de picagens */}
                        {pares && pares.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {pares.map((par, i) => (
                                    <span
                                        key={i}
                                        className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono"
                                    >
                                        {par.entrada} → {par.saida}
                                    </span>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Dia sem registo e sem férias e sem FDS */}
                {!tem_registo && !is_ferias && !is_fds && (
                    <span className="text-xs text-red-400 italic font-semibold">
                        Sem registo de picagem
                    </span>
                )}

                {/* FDS sem registo */}
                {is_fds && !tem_registo && (
                    <span className="text-xs text-gray-300 italic">
                        Fim de semana
                    </span>
                )}
            </div>

            {/* Turno */}
            <div className="shrink-0">
                {tagTurno(tp_hor)}
            </div>
        </div>
    );
};

/* ── Totais do detalhe ───────────────────────────────── */
const TotaisDetalhe = ({ totais, periodo }) => {
    const diasUteis      = periodo?.dias_uteis      || 0;
    const diasRegisto    = totais?.dias_com_registo || 0;
    const diasFerias     = totais?.dias_ferias      || 0;
    const diasErro       = totais?.dias_com_erro    || 0;
    const diasFalta      = Math.max(0, diasUteis - diasRegisto - diasFerias);

    const cards = [
        {
            label: 'Total trabalhado',
            value: totais?.horas_fmt || '00:00',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            isText: true
        },
        {
            label: 'Dias c/ registo',
            value: diasRegisto,
            color: 'text-green-600',
            bg: 'bg-green-50',
            border: 'border-green-100'
        },
        {
            label: 'Dias de férias',
            value: diasFerias,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-100',
            icon: '🌴'
        },
        {
            label: 'Faltas',
            value: diasFalta,
            color: diasFalta > 0 ? 'text-red-600' : 'text-gray-300',
            bg: diasFalta > 0 ? 'bg-red-50' : 'bg-gray-50',
            border: diasFalta > 0 ? 'border-red-100' : 'border-gray-100'
        },
        {
            label: 'Erros picagem',
            value: diasErro,
            color: diasErro > 0 ? 'text-amber-600' : 'text-gray-300',
            bg: diasErro > 0 ? 'bg-amber-50' : 'bg-gray-50',
            border: diasErro > 0 ? 'border-amber-100' : 'border-gray-100'
        },
        {
            label: 'H. noturnas',
            value: totais?.horas_noturnas_fmt || '00:00',
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
            isText: true
        },
    ];

    return (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-4 bg-slate-50 border-b">
            {cards.map(c => (
                <div
                    key={c.label}
                    className={`${c.bg} border ${c.border} rounded-xl p-3 text-center`}
                >
                    <div className={`${c.isText ? 'text-lg' : 'text-2xl'} font-black ${c.color} leading-tight`}>
                        {c.icon && <span className="mr-1 text-base">{c.icon}</span>}
                        {c.value}
                    </div>
                    <div className="text-[9px] text-gray-400 uppercase font-bold mt-1 leading-tight">
                        {c.label}
                    </div>
                </div>
            ))}
        </div>
    );
};

/* ── Detalhe do colaborador (Drawer) ───────────��─────── */
const DetalheColaborador = ({ num, nome, periodo, openNotification, onClose }) => {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (!num || !periodo) return;
        setLoading(true);

        const fdata = [
            `>=${periodo[0]}`,
            `<=${periodo[1]}`
        ];

        fetchPost({
            url: `${API_URL}/rponto/sqlp/`,
            withCredentials: true,
            parameters: { method: 'ProcessamentoSalarialDetalhe' },
            filter: { num, fdata }
        })
            .then(r => {
                if (r.data.status === 'success') setData(r.data);
                else openNotification('error', 'top', 'Erro', r.data.title);
            })
            .catch(e => openNotification('error', 'top', 'Erro', e.message))
            .finally(() => setLoading(false));
    }, [num, periodo]);

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Spin size="large" />
        </div>
    );
    if (!data) return null;

    const { totais, dias, periodo: periodoInfo } = data;

    // Contagem de dias por tipo para legenda rápida
    const nFerias  = dias.filter(d => d.is_ferias && !d.is_fds).length;
    const nFaltas  = dias.filter(d => !d.tem_registo && !d.is_ferias && !d.is_fds).length;
    const nErros   = dias.filter(d => d.tem_erro).length;

    return (
        <div className="flex flex-col h-full">

            {/* ── Totais ── */}
            <TotaisDetalhe totais={totais} periodo={periodoInfo} />

            {/* ── Alertas de resumo ── */}
            {(nErros > 0 || nFaltas > 0) && (
                <div className="px-4 pt-3 space-y-2">
                    {nFaltas > 0 && (
                        <Alert
                            type="error"
                            showIcon
                            message={`${nFaltas} dia${nFaltas > 1 ? 's' : ''} sem registo de picagem (falta${nFaltas > 1 ? 's' : ''})`}
                            className="rounded-lg text-xs"
                        />
                    )}
                    {nErros > 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            message={`${nErros} dia${nErros > 1 ? 's' : ''} com picagens inconsistentes`}
                            className="rounded-lg text-xs"
                        />
                    )}
                </div>
            )}

            {/* Nota sobre férias */}
            {nFerias > 0 && (
                <div className="px-4 pt-2">
                    <Alert
                        type="info"
                        showIcon
                        icon={<span className="text-base">🌴</span>}
                        message={`${nFerias} dia${nFerias > 1 ? 's' : ''} de férias aprovadas pelo RH`}
                        className="rounded-lg text-xs"
                    />
                </div>
            )}

            {/* ── Lista de dias ── */}
            <YScroll className="flex-1 mt-3">
                <div>
                    {dias.map(d => (
                        <DiaRow key={d.data} dia={d} />
                    ))}
                </div>
            </YScroll>
        </div>
    );
};

/* ── Componente principal ─────────���──────────────────── */
export default function ProcessamentoSalarial() {
    const { openNotification } = useContext(LayoutContext);

    const [loading, setLoading]         = useState(false);
    const [rows, setRows]               = useState([]);
    const [periodo, setPeriodo]         = useState(null);
    const [periodoLabel, setPeriodoLabel] = useState(null);
    const [fdep, setFdep]               = useState(null);
    const [fnum, setFnum]               = useState('');
    const [detalhe, setDetalhe]         = useState(null);
    const [totalInfo, setTotalInfo]     = useState(null);
    const [dateRange, setDateRange]     = useState(null);

    const buscar = useCallback(async () => {
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
            openNotification('warning', 'top', 'Atenção', 'Selecione um intervalo de datas');
            return;
        }

        const ini = dateRange[0].format('YYYY-MM-DD');
        const fim = dateRange[1].format('YYYY-MM-DD');

        setLoading(true);
        setRows([]);
        setTotalInfo(null);

        const fdata = [`>=${ini}`, `<=${fim}`];
        const filter = { fdata };
        if (fdep) filter.fdep = fdep;
        if (fnum) filter.fnum = fnum.trim();

        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'ProcessamentoSalarialResumo' },
                filter
            });
            if (r.data.status === 'success') {
                setRows(r.data.rows || []);
                setTotalInfo(r.data.periodo);
                setPeriodo([ini, fim]);
                setPeriodoLabel(
                    `${dayjs(ini).format('DD/MM/YYYY')} → ${dayjs(fim).format('DD/MM/YYYY')}`
                );
            } else {
                openNotification('error', 'top', 'Erro', r.data.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            setLoading(false);
        }
    }, [dateRange, fdep, fnum]);

    // Atalhos de período
    const atalhos = [
        {
            label: 'Processamento atual',
            range: () => {
                const hoje = dayjs();
                return [hoje.subtract(1, 'month').date(25), hoje.date(24)];
            }
        },
        {
            label: 'Mês anterior (1-31)',
            range: () => [
                dayjs().subtract(1, 'month').startOf('month'),
                dayjs().subtract(1, 'month').endOf('month')
            ]
        },
        {
            label: 'Este mês (1-hoje)',
            range: () => [dayjs().startOf('month'), dayjs()]
        },
        {
            label: 'Últimos 30 dias',
            range: () => [dayjs().subtract(30, 'day'), dayjs()]
        },
    ];

    const totalMinsTrabalhados = rows.reduce((a, r) => a + (r.total_mins || 0), 0);
    const totalErros           = rows.reduce((a, r) => a + (r.dias_com_erro || 0), 0);
    const totalFerias          = rows.reduce((a, r) => a + (r.dias_ferias || 0), 0);

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="max-w-full mx-auto space-y-4">

                {/* ── Header / Filtros ── */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
                            <ClockCircleOutlined className="text-white text-lg" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 leading-tight">
                                Processamento Salarial
                            </h2>
                            <p className="text-xs text-slate-500">
                                Selecione o intervalo de datas para calcular as horas trabalhadas
                            </p>
                        </div>
                    </div>

                    {/* Atalhos */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {atalhos.map(a => (
                            <button
                                key={a.label}
                                onClick={() => setDateRange(a.range())}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
                            >
                                {a.label}
                            </button>
                        ))}
                    </div>

                    {/* Filtros */}
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">
                                Período *
                            </label>
                            <RangePicker
                                value={dateRange}
                                onChange={setDateRange}
                                format="DD/MM/YYYY"
                                allowClear
                                size="middle"
                                placeholder={['Data início', 'Data fim']}
                                className="rounded-lg"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">
                                Departamento
                            </label>
                            <Select
                                allowClear
                                placeholder="Todos"
                                value={fdep}
                                onChange={setFdep}
                                size="middle"
                                style={{ width: 160 }}
                                options={[
                                    { value: 'DAF',   label: 'DAF' },
                                    { value: 'DSE',   label: 'DSE' },
                                    { value: 'DPLAN', label: 'DPLAN' },
                                    { value: 'DPROD', label: 'DPROD' },
                                    { value: 'DQUAL', label: 'DQUAL' },
                                    { value: 'DRH',   label: 'DRH' },
                                    { value: 'DTEC',  label: 'DTEC' },
                                ]}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">
                                Nº Colaborador
                            </label>
                            <Input
                                placeholder="Ex: 30"
                                value={fnum}
                                onChange={e => setFnum(e.target.value)}
                                onPressEnter={buscar}
                                size="middle"
                                style={{ width: 130 }}
                                allowClear
                            />
                        </div>

                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={buscar}
                            loading={loading}
                            size="middle"
                            className="bg-indigo-600 hover:bg-indigo-700 border-none font-bold"
                        >
                            Calcular
                        </Button>
                    </div>
                </div>

                {/* ── Sumário do período ── */}
                {totalInfo && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-white rounded-xl p-4 shadow-sm border text-center sm:col-span-1">
                            <div className="text-xs font-bold text-gray-400 uppercase mb-1">Período</div>
                            <div className="text-sm font-black text-slate-700">{periodoLabel}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
                            <div className="text-xs font-bold text-gray-400 uppercase mb-1">Colaboradores</div>
                            <div className="text-2xl font-black text-indigo-600">{rows.length}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
                            <div className="text-xs font-bold text-gray-400 uppercase mb-1">Total Horas</div>
                            <div className="text-2xl font-black text-blue-600">
                                {fmtHoras(totalMinsTrabalhados)}
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4 shadow-sm border border-purple-100 text-center">
                            <div className="text-xs font-bold text-purple-400 uppercase mb-1">
                                🌴 Dias Férias
                            </div>
                            <div className="text-2xl font-black text-purple-600">{totalFerias}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
                            <div className="text-xs font-bold text-gray-400 uppercase mb-1">Alertas</div>
                            <div className={`text-2xl font-black ${totalErros > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {totalErros}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tabela de resultados ── */}
                {rows.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-slate-800 text-white">
                                    <tr>
                                        {[
                                            'Nº', 'Nome', 'Dep.', 'Turno',
                                            'Dias c/ Reg.', 'Dias Férias',
                                            'Horas Trab.', 'H. Noturnas',
                                            'Alertas', ''
                                        ].map(h => (
                                            <th
                                                key={h}
                                                className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.map((row, idx) => (
                                        <tr
                                            key={row.num}
                                            className={`hover:bg-indigo-50/30 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                                        >
                                            <td className="px-4 py-3 font-black text-slate-700 whitespace-nowrap">
                                                {row.num}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                                                {row.nome}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Tag className="text-xs font-bold">{row.dep || '—'}</Tag>
                                            </td>
                                            <td className="px-4 py-3">
                                                {tagTurno(row.tp_hor)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-black text-sm">
                                                    {row.dias_com_registo}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {(row.dias_ferias || 0) > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-black text-xs">
                                                        🌴 {row.dias_ferias}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-black text-blue-700">
                                                    {row.total_horas_fmt}
                                                </span>
                                                <span className="text-[10px] text-gray-400 ml-1">
                                                    ({fmtHoras(row.total_mins)})
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {(row.mins_noturnos || 0) > 0 ? (
                                                    <span className="font-bold text-indigo-600">
                                                        {row.horas_noturnas_fmt}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.n_alertas > 0 ? (
                                                    <Tooltip
                                                        title={
                                                            <div className="text-xs">
                                                                {row.alertas.map((a, i) => (
                                                                    <div key={i}>{a.msg}</div>
                                                                ))}
                                                            </div>
                                                        }
                                                    >
                                                        <Tag color="red" className="font-bold cursor-help">
                                                            <WarningOutlined className="mr-1" />
                                                            {row.n_alertas}
                                                        </Tag>
                                                    </Tooltip>
                                                ) : (
                                                    <Tag color="green" className="font-bold">
                                                        <CheckCircleOutlined className="mr-1" />
                                                        OK
                                                    </Tag>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => setDetalhe({ num: row.num, nome: row.nome })}
                                                    className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200 whitespace-nowrap"
                                                >
                                                    Ver detalhe
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Empty state ── */}
                {!loading && rows.length === 0 && totalInfo && (
                    <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                        <SearchOutlined className="text-4xl text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">
                            Nenhum registo encontrado para o período selecionado
                        </p>
                    </div>
                )}
            </div>

            {/* ── Drawer detalhe ── */}
            <Drawer
                title={
                    <div className="flex items-center gap-2 flex-wrap">
                        <UserOutlined className="text-indigo-500" />
                        <span className="font-black">{detalhe?.nome}</span>
                        <span className="text-gray-400 font-normal text-sm">
                            — {detalhe?.num}
                        </span>
                        {periodoLabel && (
                            <span className="ml-2 text-xs text-gray-400 font-normal">
                                ({periodoLabel})
                            </span>
                        )}
                    </div>
                }
                width={720}
                open={!!detalhe}
                onClose={() => setDetalhe(null)}
                destroyOnClose
                bodyStyle={{ padding: 0 }}
            >
                {detalhe && (
                    <DetalheColaborador
                        num={detalhe.num}
                        nome={detalhe.nome}
                        periodo={periodo}
                        openNotification={openNotification}
                        onClose={() => setDetalhe(null)}
                    />
                )}
            </Drawer>
        </div>
    );
}