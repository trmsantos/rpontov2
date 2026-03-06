import React, { useContext, useState, useEffect } from 'react';
import { Tag, Spin, Empty, Input, Button } from 'antd';
import { TeamOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { fetchPost } from "utils/fetch";
import { API_URL } from "config";
import { AppContext } from './App';
import { LayoutContext } from "./GridLayout";

export default function ColaboradoresDepartamento() {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);

    const isRH       = auth?.isRH       || false;
    const isChefe    = auth?.isChefe     || false;
    const deps_chefe = auth?.deps_chefe  || [];

    const depLabel = isRH
        ? 'Todos os departamentos'
        : deps_chefe.join(', ');

    const [loading,       setLoading]       = useState(false);
    const [colaboradores, setColaboradores] = useState([]);
    const [search,        setSearch]        = useState('');

    // ✅ Função separada para poder chamar no botão Atualizar
    const loadColaboradores = async () => {
        if (!isRH && !isChefe) {
            console.warn('[ColaboradoresDep] sem papel definido');
            return;
        }
        if (isChefe && deps_chefe.length === 0) {
            console.warn('[ColaboradoresDep] isChefe=true mas deps_chefe vazio');
            return;
        }

        console.log('[ColaboradoresDep] a carregar...', { isRH, isChefe, deps_chefe });

        setLoading(true);
        try {
            const response = await fetchPost({
                url: `${API_URL}/rponto/sqlp/`,
                withCredentials: true,
                parameters: { method: 'ColaboradoresDepartamento' },
                filter: { isRH, isChefe, deps_chefe }
            });
            if (response.data?.status === 'success') {
                setColaboradores(response.data.rows || []);
            } else {
                openNotification?.('error', 'top', 'Erro', response.data?.title || 'Erro ao carregar');
            }
        } catch (e) {
            openNotification?.('error', 'top', 'Erro', e.message);
        } finally {
            setLoading(false);
        }
    };

    // ✅ CORRIGIDO: disparar quando auth.num E isChefe/isRH estiverem prontos
    useEffect(() => {
        if (!auth?.num) return;                          // auth ainda não carregou
        if (!isRH && !isChefe) return;                   // sem papel
        if (isChefe && deps_chefe.length === 0) return;  // chefe sem deps

        loadColaboradores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth?.num, isRH, isChefe, deps_chefe.length]);   // ← .length em vez de JSON.stringify

    const filtered = colaboradores.filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return c.num?.toLowerCase().includes(s) || c.nome?.toLowerCase().includes(s);
    });

    const porDep = filtered.reduce((acc, c) => {
        const dep = c.dep || 'Sem Departamento';
        if (!acc[dep]) acc[dep] = [];
        acc[dep].push(c);
        return acc;
    }, {});

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-slate-800">
                            Colaboradores do Departamento
                        </h1>
                        {depLabel && (
                            <Tag color="blue" className="font-bold text-sm px-3 py-1">
                                <TeamOutlined className="mr-1" />{depLabel}
                            </Tag>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Lista de colaboradores do seu departamento
                    </p>
                </div>
                <Button icon={<ReloadOutlined />} onClick={loadColaboradores}
                        loading={loading} className="rounded-lg">
                    Atualizar
                </Button>
            </div>

            <div className="mb-4">
                <Input
                    placeholder="Pesquisar por nome ou número..."
                    prefix={<SearchOutlined className="text-slate-400" />}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    size="large" className="rounded-xl"
                    style={{ maxWidth: 400 }} allowClear
                />
            </div>

            <Spin spinning={loading}>
                {!loading && filtered.length === 0 ? (
                    <Empty description="Nenhum colaborador encontrado" className="mt-12" />
                ) : (
                    <div className="space-y-6">
                        {Object.entries(porDep).map(([dep, colabs]) => (
                            <div key={dep}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-6 bg-blue-500 rounded-full" />
                                    <h2 className="font-bold text-slate-700 text-base">{dep}</h2>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700
                                                     rounded-full text-xs font-bold">
                                        {colabs.length} colaborador{colabs.length !== 1 ? 'es' : ''}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2
                                                lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {colabs.map((c) => (
                                        <div key={c.num}
                                             className="flex items-center gap-3 p-4 bg-white
                                                        rounded-xl border border-slate-200
                                                        hover:border-blue-300 hover:shadow-md
                                                        transition-all">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br
                                                            from-blue-500 to-blue-700 text-white
                                                            flex items-center justify-center
                                                            font-bold text-sm shadow-sm shrink-0">
                                                {c.nome?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 text-sm truncate">
                                                    {c.nome || 'Nome não disponível'}
                                                </p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {c.num}
                                                    </span>
                                                    {c.tp_hor && (
                                                        <Tag color="purple"
                                                             className="!text-[9px] !px-1 !py-0 !m-0">
                                                            {c.tp_hor}
                                                        </Tag>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Spin>
        </div>
    );
}