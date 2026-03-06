import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
    Button, Form, Input, Select, Modal, Empty, Spin,
    Tag, Tooltip, Popconfirm, Avatar, Switch
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    UserOutlined, BankOutlined, SaveOutlined,
    CloseOutlined, SyncOutlined, TeamOutlined
} from '@ant-design/icons';
import { fetchPost } from "utils/fetch";
import { useSubmitting } from "utils";
import { API_URL } from "config";
import { LayoutContext } from "./GridLayout";

/* ── Modal Criar/Editar Departamento ────────────────────────── */
const DepModal = ({ dep, open, onClose, onRefresh }) => {
    const [form] = Form.useForm();
    const { openNotification } = useContext(LayoutContext);
    const submitting = useSubmitting(false);

    useEffect(() => {
        if (open) form.setFieldsValue(dep || { ativo: 1 });
    }, [open, dep]);

    const handleSave = async (values) => {
        submitting.trigger();
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "DepartamentoSave" },
                filter: { ...values, id: dep?.id }
            });
            if (res.data.status === 'success') {
                openNotification('success', 'top', 'Sucesso', res.data.title);
                onRefresh();
                onClose();
            } else {
                openNotification('error', 'top', 'Erro', res.data.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            submitting.end();
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <BankOutlined className="text-blue-500" />
                    <span className="font-black">
                        {dep ? 'Editar Departamento' : 'Novo Departamento'}
                    </span>
                </div>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            centered
        >
            <Form form={form} layout="vertical" onFinish={handleSave} className="pt-4">
                <Form.Item name="codigo"
                    label={<span className="text-xs font-bold text-gray-600 uppercase">Código</span>}
                    rules={[{ required: true, message: 'Código obrigatório' }]}
                >
                    <Input
                        placeholder="ex: DPROD"
                        size="large"
                        className="rounded-lg font-mono"
                        disabled={!!dep}
                        style={{ textTransform: 'uppercase' }}
                    />
                </Form.Item>
                <Form.Item name="nome"
                    label={<span className="text-xs font-bold text-gray-600 uppercase">Nome</span>}
                    rules={[{ required: true, message: 'Nome obrigatório' }]}
                >
                    <Input
                        placeholder="ex: Produção"
                        size="large"
                        className="rounded-lg"
                    />
                </Form.Item>
                <Form.Item name="ativo"
                    label={<span className="text-xs font-bold text-gray-600 uppercase">Ativo</span>}
                    valuePropName="checked"
                    getValueFromEvent={(v) => v ? 1 : 0}
                    getValueProps={(v)   => ({ checked: v === 1 })}
                >
                    <Switch />
                </Form.Item>
                <div className="flex gap-3 justify-end pt-2">
                    <Button onClick={onClose} icon={<CloseOutlined />}>
                        Cancelar
                    </Button>
                    <Button htmlType="submit" type="primary"
                            icon={<SaveOutlined />}
                            loading={submitting.state}
                            className="bg-blue-600 hover:bg-blue-700 border-none rounded-lg">
                        Guardar
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

/* ── Modal Adicionar Chefe ───────────────────────────────────── */
const ChefeModal = ({ depCodigo, open, onClose, onRefresh }) => {
    const [form] = Form.useForm();
    const { openNotification } = useContext(LayoutContext);
    const submitting = useSubmitting(false);

    // Lista completa de colaboradores carregada ao abrir
    const [colaboradores, setColaboradores] = useState([]);
    const [loadingColab,  setLoadingColab]  = useState(false);
    const [searchTerm,    setSearchTerm]    = useState('');

    // Carregar colaboradores do SAGE ao abrir o modal
    useEffect(() => {
        if (open) {
            loadColaboradores('');
        }
    }, [open]);

    const loadColaboradores = async (search) => {
        setLoadingColab(true);
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "ColaboradoresSageLookup" },
                filter: { search: search || '' }
            });
            if (res.data.status === 'success') {
                setColaboradores(
                    (res.data.rows || []).map(r => ({
                        value: r.num,
                        label: `${r.num} — ${r.nome}`,
                        nome:  r.nome,
                        num:   r.num
                    }))
                );
            }
        } catch (e) {
            /* silencioso */
        } finally {
            setLoadingColab(false);
        }
    };

    // Pesquisa com debounce
    const handleSearch = useCallback((val) => {
        setSearchTerm(val);
        if (val.length >= 2 || val.length === 0) {
            loadColaboradores(val);
        }
    }, []);

    const handleSave = async (values) => {
        submitting.trigger();
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "ChefeSave" },
                filter: {
                    dep_codigo: depCodigo,
                    num_chefe:  values.num_chefe,
                    dt_inicio:  values.dt_inicio,
                    ativo: 1
                }
            });
            if (res.data.status === 'success') {
                openNotification('success', 'top', 'Sucesso', res.data.title);
                onRefresh();
                onClose();
                form.resetFields();
                setSearchTerm('');
            } else {
                openNotification('error', 'top', 'Erro', res.data.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            submitting.end();
        }
    };

    const handleClose = () => {
        onClose();
        form.resetFields();
        setSearchTerm('');
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <UserOutlined className="text-blue-500" />
                    <span className="font-black">Adicionar Chefe</span>
                    {depCodigo && (
                        <Tag color="blue" className="font-mono font-bold">
                            {depCodigo}
                        </Tag>
                    )}
                </div>
            }
            open={open}
            onCancel={handleClose}
            footer={null}
            destroyOnClose
            centered
            width={480}
        >
            <Form form={form} layout="vertical"
                  onFinish={handleSave} className="pt-4">
                <Form.Item
                    name="num_chefe"
                    label={
                        <span className="text-xs font-bold text-gray-600 uppercase">
                            Colaborador
                        </span>
                    }
                    rules={[{ required: true, message: 'Selecione o colaborador' }]}
                >
                    <Select
                        showSearch
                        placeholder="Pesquisar por nome ou número..."
                        filterOption={false}
                        onSearch={handleSearch}
                        loading={loadingColab}
                        size="large"
                        className="rounded-lg"
                        notFoundContent={
                            loadingColab
                                ? <div className="flex justify-center p-4">
                                    <Spin size="small" />
                                  </div>
                                : <div className="text-center p-4 text-gray-400 text-sm">
                                    Sem resultados
                                  </div>
                        }
                        optionRender={(opt) => (
                            <div className="flex items-center gap-2 py-0.5">
                                <div className="w-7 h-7 rounded-full bg-slate-600 text-white
                                                flex items-center justify-center text-xs
                                                font-black shrink-0">
                                    {opt.data.nome?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">
                                        {opt.data.nome}
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono">
                                        {opt.data.num}
                                    </div>
                                </div>
                            </div>
                        )}
                        options={colaboradores}
                    />
                </Form.Item>

                <Form.Item
                    name="dt_inicio"
                    label={
                        <span className="text-xs font-bold text-gray-600 uppercase">
                            Data de início
                        </span>
                    }
                    rules={[{ required: true, message: 'Data de início obrigatória' }]}
                    initialValue={new Date().toISOString().slice(0, 10)}
                >
                    <Input type="date" size="large" className="rounded-lg" />
                </Form.Item>

                <div className="flex gap-3 justify-end pt-2">
                    <Button onClick={handleClose} icon={<CloseOutlined />}>
                        Cancelar
                    </Button>
                    <Button htmlType="submit" type="primary"
                            loading={submitting.state}
                            icon={<SaveOutlined />}
                            className="bg-blue-600 hover:bg-blue-700 border-none rounded-lg">
                        Adicionar
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

/* ── Card de Departamento ────────────────────────────────────── */
const DepCard = ({ dep, chefes, onEdit, onAddChefe, onRemoveChefe }) => {
    const chefesDoDepto = chefes.filter(
        c => c.dep_codigo === dep.codigo && c.ativo === 1
    );

    return (
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden
                         transition-all hover:shadow-md flex flex-col
                         ${dep.ativo ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b
                            border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500
                                    to-indigo-600 flex items-center justify-center
                                    text-white font-black text-sm shadow-md shrink-0">
                        {dep.codigo?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-800">{dep.nome}</span>
                            {!dep.ativo && (
                                <Tag color="default" className="text-xs">Inativo</Tag>
                            )}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                            {dep.codigo}
                        </span>
                    </div>
                </div>

                <div className="flex gap-1 shrink-0">
                    <Tooltip title="Adicionar chefe">
                        <Button
                            icon={<PlusOutlined />}
                            size="small"
                            onClick={() => onAddChefe(dep.codigo)}
                            className="rounded-lg text-blue-500 border-blue-200
                                       hover:bg-blue-50"
                        />
                    </Tooltip>
                    <Tooltip title="Editar departamento">
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => onEdit(dep)}
                            className="rounded-lg"
                        />
                    </Tooltip>
                </div>
            </div>

            {/* Chefes */}
            <div className="p-4 flex-1">
                <div className="flex items-center gap-2 mb-3">
                    <TeamOutlined className="text-slate-400 text-xs" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wide">
                        Chefes Ativos ({chefesDoDepto.length})
                    </p>
                </div>

                {chefesDoDepto.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed
                                    border-slate-200 rounded-xl">
                        <UserOutlined className="text-2xl text-slate-300 mb-1" />
                        <p className="text-slate-300 text-xs font-semibold">
                            Sem chefes atribuídos
                        </p>
                        <button
                            onClick={() => onAddChefe(dep.codigo)}
                            className="mt-2 text-xs text-blue-500 hover:text-blue-700
                                       font-semibold transition-colors"
                        >
                            + Adicionar chefe
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {chefesDoDepto.map(chefe => (
                            <div key={chefe.id}
                                 className="flex items-center gap-3 p-2.5 rounded-xl
                                            bg-slate-50 hover:bg-blue-50/50
                                            border border-slate-100 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br
                                                from-blue-500 to-indigo-600 text-white
                                                flex items-center justify-center
                                                font-black text-xs shrink-0">
                                    {(chefe.nome_chefe || chefe.num_chefe || '?').charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-700 text-sm truncate">
                                        {chefe.nome_chefe || chefe.num_chefe}
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                        {chefe.num_chefe}
                                        {chefe.dt_inicio && (
                                            <span className="ml-1 text-slate-300">
                                                · desde {chefe.dt_inicio}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <Popconfirm
                                    title="Remover chefe?"
                                    description="A associação será desativada."
                                    onConfirm={() => onRemoveChefe(chefe.id)}
                                    okText="Remover"
                                    cancelText="Cancelar"
                                    okButtonProps={{ danger: true }}
                                    placement="left"
                                >
                                    <Button
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        danger
                                        type="text"
                                        className="shrink-0 opacity-50 hover:opacity-100"
                                    />
                                </Popconfirm>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════ */
export default function GestaoDepart() {
    const { openNotification } = useContext(LayoutContext);

    const [departamentos,     setDepartamentos]     = useState([]);
    const [chefes,            setChefes]            = useState([]);
    const [loading,           setLoading]           = useState(false);
    const [depModalOpen,      setDepModalOpen]      = useState(false);
    const [chefeModalOpen,    setChefeModalOpen]    = useState(false);
    const [selectedDep,       setSelectedDep]       = useState(null);
    const [selectedDepCodigo, setSelectedDepCodigo] = useState(null);
    const [search,            setSearch]            = useState('');
    const [showInativos,      setShowInativos]      = useState(false);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [depsRes, chefesRes] = await Promise.all([
                fetchPost({
                    url: `${API_URL}/rponto/sqlp/`,
                    withCredentials: true,
                    parameters: { method: "DepartamentosList" },
                    filter: {}
                }),
                fetchPost({
                    url: `${API_URL}/rponto/sqlp/`,
                    withCredentials: true,
                    parameters: { method: "ChefesList" },
                    filter: {}
                })
            ]);
            if (depsRes.data.status   === 'success') setDepartamentos(depsRes.data.rows   || []);
            if (chefesRes.data.status === 'success') setChefes(chefesRes.data.rows || []);
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        } finally {
            setLoading(false);
        }
    }, [openNotification]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleRemoveChefe = useCallback(async (chefeId) => {
        try {
            const res = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: "ChefeDelete" },
                filter: { id: chefeId }
            });
            if (res.data.status === 'success') {
                openNotification('success', 'top', 'Removido', res.data.title);
                loadAll();
            } else {
                openNotification('error', 'top', 'Erro', res.data.title);
            }
        } catch (e) {
            openNotification('error', 'top', 'Erro', e.message);
        }
    }, [openNotification, loadAll]);

    // Filtrar
    const filtered = departamentos.filter(d => {
        const matchSearch =
            d.codigo?.toLowerCase().includes(search.toLowerCase()) ||
            d.nome?.toLowerCase().includes(search.toLowerCase());
        const matchAtivo = showInativos ? true : d.ativo === 1;
        return matchSearch && matchAtivo;
    });

    const totalChefesAtivos = chefes.filter(c => c.ativo === 1).length;
    const depSemChefe       = departamentos.filter(d =>
        d.ativo === 1 &&
        !chefes.some(c => c.dep_codigo === d.codigo && c.ativo === 1)
    ).length;

    return (
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen">

            {/* ── Header ── */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5
                            flex flex-col sm:flex-row items-start sm:items-center
                            justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500
                                    to-indigo-600 flex items-center justify-center shadow">
                        <BankOutlined className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800">
                            Departamentos e Chefes
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Gerir departamentos e atribuir chefes via SAGE
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        icon={<SyncOutlined />}
                        onClick={loadAll}
                        loading={loading}
                        className="font-semibold"
                    >
                        Atualizar
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => { setSelectedDep(null); setDepModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 border-none
                                   font-bold rounded-xl shadow-md"
                    >
                        Novo Departamento
                    </Button>
                </div>
            </div>

            {/* ── KPIs + Filtros ── */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* KPIs */}
                <div className="flex gap-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center min-w-[90px]">
                        <p className="text-2xl font-black text-blue-600">
                            {departamentos.filter(d => d.ativo === 1).length}
                        </p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            Departamentos
                        </p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center min-w-[90px]">
                        <p className="text-2xl font-black text-green-600">
                            {totalChefesAtivos}
                        </p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            Chefes Ativos
                        </p>
                    </div>
                    {depSemChefe > 0 && (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl
                                        p-4 text-center min-w-[90px]">
                            <p className="text-2xl font-black text-orange-500">
                                {depSemChefe}
                            </p>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                Sem Chefe
                            </p>
                        </div>
                    )}
                </div>

                {/* Filtros */}
                <div className="flex gap-2 flex-1 items-center justify-end flex-wrap">
                    <label className="flex items-center gap-2 text-xs text-slate-500
                                      font-semibold cursor-pointer">
                        <Switch
                            size="small"
                            checked={showInativos}
                            onChange={setShowInativos}
                        />
                        Mostrar inativos
                    </label>
                    <Input
                        placeholder="Pesquisar departamento..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        allowClear
                        size="large"
                        className="rounded-xl sm:w-64"
                    />
                </div>
            </div>

            {/* ── Grid ── */}
            {loading ? (
                <div className="flex justify-center items-center p-16 bg-white
                                rounded-xl border border-slate-200">
                    <Spin size="large" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200">
                    <Empty
                        description="Nenhum departamento encontrado"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        className="py-16"
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(dep => (
                        <DepCard
                            key={dep.id}
                            dep={dep}
                            chefes={chefes}
                            onEdit={(d) => {
                                setSelectedDep(d);
                                setDepModalOpen(true);
                            }}
                            onAddChefe={(codigo) => {
                                setSelectedDepCodigo(codigo);
                                setChefeModalOpen(true);
                            }}
                            onRemoveChefe={handleRemoveChefe}
                        />
                    ))}
                </div>
            )}

            {/* ── Modals ── */}
            <DepModal
                dep={selectedDep}
                open={depModalOpen}
                onClose={() => setDepModalOpen(false)}
                onRefresh={loadAll}
            />
            <ChefeModal
                depCodigo={selectedDepCodigo}
                open={chefeModalOpen}
                onClose={() => setChefeModalOpen(false)}
                onRefresh={loadAll}
            />
        </div>
    );
}