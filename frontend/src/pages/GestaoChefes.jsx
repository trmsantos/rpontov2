import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    Card, Table, Button, Modal, Form, Select, DatePicker,
    Tag, Tooltip, Popconfirm, Space, Input, Badge,
    Typography, Divider, Empty, notification, Alert
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, CrownOutlined,
    UserOutlined, TeamOutlined, SearchOutlined,
    CheckCircleOutlined, CloseCircleOutlined,
    ReloadOutlined, SafetyOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { API_URL } from 'config';
import { fetchPost } from 'utils/fetch';
import { AppContext } from './App';
import dayjs from 'dayjs';
import 'dayjs/locale/pt';

dayjs.locale('pt');

const { Title, Text } = Typography;
const { Option } = Select;

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════ */
export default function GestaoChefes() {
    const { auth } = useContext(AppContext);
    const [api, contextHolder] = notification.useNotification();

    /* ── Estado ─────────────────────────────────────── */
    const [deps,          setDeps]          = useState([]);   // departamentos distinct
    const [chefes,        setChefes]        = useState([]);   // chefes atuais
    const [loadingDeps,   setLoadingDeps]   = useState(false);
    const [loadingChefes, setLoadingChefes] = useState(false);
    const [loadingColabs, setLoadingColabs] = useState(false);
    const [saving,        setSaving]        = useState(false);
    const [deleting,      setDeleting]      = useState(null); // id a apagar

    // Modal
    const [modalOpen,   setModalOpen]   = useState(false);
    const [selectedDep, setSelectedDep] = useState(null);

    // Select de colaboradores (search)
    const [colabOptions, setColabOptions]   = useState([]);
    const [colabSearch,  setColabSearch]    = useState('');

    const [form] = Form.useForm();

    /* ── Verificar permissão — só RH ou Admin ────────── */
    const podeGerir = auth?.isRH || auth?.isAdmin;

    /* ── Carregar departamentos ──────────────────────── */
    const loadDeps = useCallback(async () => {
        setLoadingDeps(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'DepartamentosDistinctList' },
                filter: {}
            });
            if (r.data?.status === 'success') {
                setDeps(r.data.rows || []);
            }
        } catch (e) {
            api.error({ message: 'Erro ao carregar departamentos', description: e.message });
        } finally {
            setLoadingDeps(false);
        }
    }, [api]);

    /* ── Carregar chefes ─────────────────────────────── */
    const loadChefes = useCallback(async () => {
        setLoadingChefes(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'ChefesDistinctList' },
                filter: {}
            });
            if (r.data?.status === 'success') {
                setChefes(r.data.rows || []);
            }
        } catch (e) {
            api.error({ message: 'Erro ao carregar chefes', description: e.message });
        } finally {
            setLoadingChefes(false);
        }
    }, [api]);

    /* ── Pesquisar colaboradores (SAGE) ──────────────── */
    const searchColabs = useCallback(async (search) => {
        if (!search || search.length < 2) {
            setColabOptions([]);
            return;
        }
        setLoadingColabs(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'ColaboradoresSageLookup' },
                filter: { search }
            });
            if (r.data?.status === 'success') {
                setColabOptions(r.data.rows || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingColabs(false);
        }
    }, []);

    useEffect(() => {
        loadDeps();
        loadChefes();
    }, []);

    /* ── Debounce na pesquisa ────────────────────────── */
    useEffect(() => {
        const t = setTimeout(() => searchColabs(colabSearch), 350);
        return () => clearTimeout(t);
    }, [colabSearch]);

    /* ── Guardar chefe ───────────────────────────────── */
    const handleSave = async (values) => {
        setSaving(true);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'ChefeSave' },
                filter: {
                    dep_codigo: values.dep_codigo,
                    num_chefe:  values.num_chefe,
                    dt_inicio:  values.dt_inicio
                                ? dayjs(values.dt_inicio).format('YYYY-MM-DD')
                                : dayjs().format('YYYY-MM-DD'),
                    ativo: 1
                }
            });

            if (r.data?.status === 'success') {
                api.success({
                    message:     'Chefe associado com sucesso!',
                    description: r.data.title,
                    placement:   'bottomRight',
                    duration:    3
                });
                setModalOpen(false);
                form.resetFields();
                setColabOptions([]);
                setColabSearch('');
                loadChefes();
            } else {
                api.error({
                    message:     'Erro ao guardar',
                    description: r.data?.title || 'Erro desconhecido',
                    duration:    5
                });
            }
        } catch (e) {
            api.error({ message: 'Erro', description: e.message });
        } finally {
            setSaving(false);
        }
    };

    /* ── Remover chefe ───────────────────────────────── */
    const handleDelete = async (id) => {
        setDeleting(id);
        try {
            const r = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'ChefeDelete' },
                filter: { id }
            });

            if (r.data?.status === 'success') {
                api.success({
                    message:   'Chefe removido',
                    placement: 'bottomRight',
                    duration:  2
                });
                loadChefes();
            } else {
                api.error({
                    message:     'Erro ao remover',
                    description: r.data?.title
                });
            }
        } catch (e) {
            api.error({ message: 'Erro', description: e.message });
        } finally {
            setDeleting(null);
        }
    };

    /* ── Abrir modal com dep pré-selecionado ─────────── */
    const openModal = (depCodigo = null) => {
        form.resetFields();
        setColabOptions([]);
        setColabSearch('');
        if (depCodigo) {
            form.setFieldsValue({ dep_codigo: depCodigo });
            setSelectedDep(depCodigo);
        } else {
            setSelectedDep(null);
        }
        setModalOpen(true);
    };

    /* ── Agrupar chefes por departamento ─────���───────── */
    const chefesPorDep = React.useMemo(() => {
        const m = {};
        deps.forEach(d => { m[d.codigo] = []; });
        chefes.forEach(c => {
            if (!m[c.dep_codigo]) m[c.dep_codigo] = [];
            m[c.dep_codigo].push(c);
        });
        return m;
    }, [deps, chefes]);

    /* ── Sem permissão ───────────────────────────────── */
    if (!podeGerir) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100
                            via-slate-50 to-indigo-50 p-4 sm:p-6
                            flex items-center justify-center">
                <Card className="shadow-xl border-0 max-w-md w-full text-center"
                      bodyStyle={{ padding: '40px 32px' }}>
                    <SafetyOutlined className="text-5xl text-slate-300 mb-4" />
                    <h2 className="text-xl font-bold text-slate-600 mb-2">
                        Acesso Restrito
                    </h2>
                    <p className="text-sm text-slate-400">
                        Esta página é apenas acessível a utilizadores de
                        <strong> Recursos Humanos</strong>.
                    </p>
                </Card>
            </div>
        );
    }

    /* ═══════════════════════════════════════════════════
       RENDER PRINCIPAL
    ═══════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100
                        via-slate-50 to-indigo-50 p-2 sm:p-4 md:p-6">
            {contextHolder}

            <div className="max-w-5xl mx-auto space-y-4">

                {/* ══ HEADER ══════════════════════════════════════ */}
                <Card className="shadow-xl border-0 overflow-hidden"
                      bodyStyle={{ padding: 0 }}>
                    <div className="h-1 bg-gradient-to-r from-indigo-500
                                    via-purple-500 to-amber-500" />
                    <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row
                                        sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 sm:w-12 sm:h-12
                                                bg-gradient-to-br from-amber-400
                                                to-orange-500 rounded-xl
                                                flex items-center justify-center shadow-lg">
                                    <CrownOutlined className="text-white text-xl" />
                                </div>
                                <div>
                                    <h1 className="text-lg sm:text-xl font-black text-slate-800">
                                        Gestão de Chefes de Departamento
                                    </h1>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Associe colaboradores como chefes de cada departamento
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button icon={<ReloadOutlined />}
                                        size="small"
                                        onClick={() => { loadDeps(); loadChefes(); }}
                                        loading={loadingDeps || loadingChefes}
                                        className="!text-xs">
                                    Atualizar
                                </Button>
                                <Button type="primary"
                                        icon={<PlusOutlined />}
                                        size="small"
                                        onClick={() => openModal()}
                                        className="!bg-indigo-500 hover:!bg-indigo-600
                                                   !border-0 !shadow-md !text-xs font-bold">
                                    Adicionar Chefe
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* ══ INFO ════════════════════════════════════════ */}
                <Alert
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    message={
                        <span className="text-xs font-semibold">
                            Como funciona o controlo de acesso
                        </span>
                    }
                    description={
                        <div className="text-xs text-slate-600 space-y-1 mt-1">
                            <div className="flex items-start gap-1.5">
                                <SafetyOutlined className="text-purple-500 mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>RH / Admin</strong> — vê os horários de todos os
                                    colaboradores e todos os departamentos.
                                </span>
                            </div>
                            <div className="flex items-start gap-1.5">
                                <CrownOutlined className="text-amber-500 mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>Chefe de Departamento</strong> — ao efetuar login, se o
                                    número do colaborador estiver ativo nesta tabela, o sistema
                                    atribui automaticamente o papel de chefe, permitindo ver os
                                    horários do(s) seu(s) departamento(s).
                                </span>
                            </div>
                            <div className="flex items-start gap-1.5">
                                <UserOutlined className="text-blue-500 mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>Colaborador</strong> — vê apenas o seu próprio horário.
                                </span>
                            </div>
                        </div>
                    }
                    className="!border-indigo-200 !bg-indigo-50"
                />

                {/* ══ LISTA POR DEPARTAMENTO ══════════════════════ */}
                {loadingDeps || loadingChefes ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-indigo-500
                                            border-t-transparent rounded-full
                                            animate-spin mx-auto mb-3" />
                            <p className="text-sm text-slate-400">A carregar...</p>
                        </div>
                    </div>
                ) : deps.length === 0 ? (
                    <Card className="shadow-lg border-0">
                        <Empty description="Nenhum departamento encontrado"
                               image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {deps.map(dep => {
                            const chefesDesDep = chefesPorDep[dep.codigo] || [];
                            const temChefe     = chefesDesDep.length > 0;

                            return (
                                <Card key={dep.codigo}
                                      className={`shadow-lg border-0 overflow-hidden
                                          transition-all hover:shadow-xl
                                          ${temChefe ? '' : 'border-l-4 !border-l-amber-300'}`}
                                      bodyStyle={{ padding: 0 }}>

                                    {/* Barra de status */}
                                    <div className={`h-1 ${temChefe
                                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                                        : 'bg-gradient-to-r from-amber-300 to-orange-400'}`} />

                                    <div className="p-4">
                                        {/* Header do departamento */}
                                        <div className="flex items-center
                                                        justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-lg
                                                    flex items-center justify-center
                                                    text-white text-xs font-black shadow
                                                    ${temChefe
                                                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                                        : 'bg-gradient-to-br from-amber-400 to-orange-400'
                                                    }`}>
                                                    <TeamOutlined />
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm text-slate-800">
                                                        {dep.codigo}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {temChefe
                                                            ? `${chefesDesDep.length} chefe${chefesDesDep.length > 1 ? 's' : ''}`
                                                            : 'Sem chefe definido'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Tooltip title={`Adicionar chefe ao ${dep.codigo}`}>
                                                <Button type="text"
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() => openModal(dep.codigo)}
                                                        className="!text-indigo-500
                                                                   hover:!bg-indigo-50
                                                                   !rounded-lg" />
                                            </Tooltip>
                                        </div>

                                        {/* Lista de chefes */}
                                        {chefesDesDep.length === 0 ? (
                                            <div className="text-center py-3
                                                            border-2 border-dashed
                                                            border-amber-200 rounded-lg
                                                            bg-amber-50">
                                                <CrownOutlined className="text-amber-300 text-lg mb-1" />
                                                <p className="text-[10px] text-amber-500 font-medium">
                                                    Nenhum chefe associado
                                                </p>
                                                <Button type="link" size="small"
                                                        className="!text-[10px] !text-amber-600
                                                                   !p-0 !h-auto"
                                                        onClick={() => openModal(dep.codigo)}>
                                                    + Associar agora
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {chefesDesDep.map(chefe => (
                                                    <div key={chefe.id}
                                                         className="flex items-center
                                                                    justify-between
                                                                    p-2 rounded-lg
                                                                    bg-slate-50
                                                                    border border-slate-100
                                                                    hover:bg-slate-100
                                                                    transition-colors">
                                                        <div className="flex items-center gap-2
                                                                        min-w-0">
                                                            <div className="w-7 h-7 rounded-full
                                                                            bg-gradient-to-br
                                                                            from-indigo-400
                                                                            to-purple-500
                                                                            flex items-center
                                                                            justify-center
                                                                            text-white text-[10px]
                                                                            font-black
                                                                            flex-shrink-0 shadow">
                                                                {(chefe.nome_chefe || chefe.num_chefe)
                                                                    .charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold
                                                                              text-slate-700
                                                                              truncate">
                                                                    {chefe.nome_chefe
                                                                        || chefe.num_chefe}
                                                                </p>
                                                                <div className="flex items-center
                                                                                gap-1 flex-wrap">
                                                                    <span className="text-[9px]
                                                                                     text-slate-400">
                                                                        {chefe.num_chefe}
                                                                    </span>
                                                                    {chefe.dt_inicio && (
                                                                        <span className="text-[9px]
                                                                                         text-slate-300">
                                                                            · desde {chefe.dt_inicio}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center
                                                                        gap-1 flex-shrink-0">
                                                            <Tag color="success"
                                                                 className="!text-[8px]
                                                                            !px-1 !py-0
                                                                            !m-0 !leading-4">
                                                                <CheckCircleOutlined /> Ativo
                                                            </Tag>
                                                            <Popconfirm
                                                                title="Remover chefe"
                                                                description={
                                                                    <span className="text-xs">
                                                                        Tem a certeza que quer remover
                                                                        <strong> {chefe.nome_chefe
                                                                            || chefe.num_chefe}</strong>?
                                                                        <br />
                                                                        O colaborador perderá as
                                                                        permissões de chefe.
                                                                    </span>
                                                                }
                                                                okText="Sim, remover"
                                                                cancelText="Cancelar"
                                                                okButtonProps={{
                                                                    danger: true,
                                                                    size: 'small'
                                                                }}
                                                                cancelButtonProps={{ size: 'small' }}
                                                                onConfirm={() => handleDelete(chefe.id)}
                                                            >
                                                                <Button type="text"
                                                                        danger
                                                                        size="small"
                                                                        icon={<DeleteOutlined />}
                                                                        loading={deleting === chefe.id}
                                                                        className="!w-6 !h-6
                                                                                   !min-w-0
                                                                                   !p-0
                                                                                   !rounded-md" />
                                                            </Popconfirm>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Resumo global */}
                {!loadingDeps && !loadingChefes && deps.length > 0 && (
                    <Card className="shadow-lg border-0"
                          bodyStyle={{ padding: '12px 16px' }}>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-xs text-slate-500">
                                    <strong className="text-slate-700">
                                        {deps.filter(d =>
                                            (chefesPorDep[d.codigo] || []).length > 0
                                        ).length}
                                    </strong> departamentos com chefe
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <span className="text-xs text-slate-500">
                                    <strong className="text-slate-700">
                                        {deps.filter(d =>
                                            (chefesPorDep[d.codigo] || []).length === 0
                                        ).length}
                                    </strong> departamentos sem chefe
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                <span className="text-xs text-slate-500">
                                    <strong className="text-slate-700">
                                        {chefes.length}
                                    </strong> chefes ativos no total
                                </span>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* ══ MODAL — ADICIONAR CHEFE ══════════════════════ */}
            <Modal title={
                       <div className="flex items-center gap-2">
                           <CrownOutlined className="text-amber-500" />
                           <span>Associar Chefe de Departamento</span>
                       </div>
                   }
                   open={modalOpen}
                   onCancel={() => {
                       setModalOpen(false);
                       form.resetFields();
                       setColabOptions([]);
                       setColabSearch('');
                   }}
                   footer={null}
                   width={480}
                   destroyOnClose>

                <Divider className="!mt-3 !mb-4" />

                <Alert
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined className="text-indigo-400" />}
                    message={
                        <span className="text-xs">
                            Após guardar, o colaborador terá automaticamente acesso ao
                            horário do departamento ao efetuar login.
                        </span>
                    }
                    className="!mb-4 !text-xs !border-indigo-200 !bg-indigo-50" />

                <Form form={form}
                      layout="vertical"
                      onFinish={handleSave}
                      requiredMark={false}
                      size="middle">

                    {/* Departamento */}
                    <Form.Item
                        name="dep_codigo"
                        label={
                            <span className="text-xs font-semibold text-slate-600">
                                Departamento
                            </span>
                        }
                        rules={[{ required: true, message: 'Selecione o departamento' }]}>
                        <Select
                            placeholder="Selecione o departamento"
                            loading={loadingDeps}
                            showSearch
                            optionFilterProp="children"
                            onChange={v => setSelectedDep(v)}
                            className="!text-sm">
                            {deps.map(d => (
                                <Option key={d.codigo} value={d.codigo}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">{d.codigo}</span>
                                        <span className="text-xs text-slate-400 ml-2">
                                            {(chefesPorDep[d.codigo] || []).length > 0
                                                ? <Tag color="success" className="!text-[9px] !px-1">
                                                    {(chefesPorDep[d.codigo] || []).length} chefe(s)
                                                  </Tag>
                                                : <Tag color="warning" className="!text-[9px] !px-1">
                                                    Sem chefe
                                                  </Tag>
                                            }
                                        </span>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {/* Colaborador */}
                    <Form.Item
                        name="num_chefe"
                        label={
                            <span className="text-xs font-semibold text-slate-600">
                                Colaborador (Chefe)
                            </span>
                        }
                        rules={[{ required: true, message: 'Selecione o colaborador' }]}
                        extra={
                            <span className="text-[10px] text-slate-400">
                                Pesquise pelo nome ou número do colaborador
                            </span>
                        }>
                        <Select
                            showSearch
                            placeholder="Escreva para pesquisar..."
                            filterOption={false}
                            onSearch={v => setColabSearch(v)}
                            loading={loadingColabs}
                            notFoundContent={
                                colabSearch.length < 2
                                    ? <span className="text-xs text-slate-400 p-2">
                                          Escreva pelo menos 2 caracteres
                                      </span>
                                    : loadingColabs
                                        ? <span className="text-xs text-slate-400 p-2">
                                              A pesquisar...
                                          </span>
                                        : <span className="text-xs text-slate-400 p-2">
                                              Nenhum resultado
                                          </span>
                            }
                            className="!text-sm">
                            {colabOptions.map(c => (
                                <Option key={c.num} value={c.num}>
                                    <div className="flex items-center gap-2 py-0.5">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100
                                                        flex items-center justify-center
                                                        text-indigo-600 text-[10px] font-black
                                                        flex-shrink-0">
                                            {c.nome.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-700
                                                          truncate">
                                                {c.nome}
                                            </p>
                                            <p className="text-[10px] text-slate-400">{c.num}</p>
                                        </div>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {/* Data de início */}
                    <Form.Item
                        name="dt_inicio"
                        label={
                            <span className="text-xs font-semibold text-slate-600">
                                Data de início
                            </span>
                        }
                        initialValue={dayjs()}
                        extra={
                            <span className="text-[10px] text-slate-400">
                                Data a partir da qual o colaborador tem acesso como chefe
                            </span>
                        }>
                        <DatePicker
                            format="DD/MM/YYYY"
                            className="w-full"
                            placeholder="Selecione a data"
                            defaultValue={dayjs()} />
                    </Form.Item>

                    {/* Chefes já existentes no dep selecionado */}
                    {selectedDep && (chefesPorDep[selectedDep] || []).length > 0 && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200
                                        rounded-lg">
                            <p className="text-xs font-semibold text-amber-700 mb-2">
                                <CrownOutlined className="mr-1" />
                                Chefes já existentes em {selectedDep}:
                            </p>
                            <div className="space-y-1">
                                {(chefesPorDep[selectedDep] || []).map(c => (
                                    <div key={c.id}
                                         className="flex items-center gap-2 text-xs
                                                    text-amber-700">
                                        <CheckCircleOutlined className="text-emerald-500" />
                                        <span className="font-medium">
                                            {c.nome_chefe || c.num_chefe}
                                        </span>
                                        <span className="text-amber-400">
                                            ({c.num_chefe})
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-amber-500 mt-2">
                                Pode ter múltiplos chefes por departamento.
                            </p>
                        </div>
                    )}

                    {/* Botões */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button size="middle"
                                onClick={() => {
                                    setModalOpen(false);
                                    form.resetFields();
                                    setColabOptions([]);
                                    setColabSearch('');
                                }}>
                            Cancelar
                        </Button>
                        <Button type="primary"
                                htmlType="submit"
                                size="middle"
                                loading={saving}
                                icon={<CheckCircleOutlined />}
                                className="!bg-indigo-500 hover:!bg-indigo-600
                                           !border-0 font-bold">
                            Guardar
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}