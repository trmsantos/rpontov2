import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Form, Input } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined, EditOutlined } from '@ant-design/icons';
import { fetchPost } from "utils/fetch";
import { DATE_FORMAT } from "config";

const DataTable = ({
    columns = [],
    apiConfig = {},
    filterFields = [],
    onRowEdit,
    toolbarButtons = null,
    pageSize = 20,
    defaultSort = [],
    rowClassName,
    openNotification,
    // onRowPatch - não utilizar (quebra o codigo todo)!!!!!!!!
    onRegisterPatch,
}) => {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [activeFilters, setActiveFilters] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [formFilter] = Form.useForm();
    const filterFieldsRef = useRef(filterFields);
    useEffect(() => { filterFieldsRef.current = filterFields; });
    const apiConfigRef = useRef(apiConfig);
    const defaultSortRef = useRef(defaultSort);
    const pageSizeRef = useRef(pageSize);
    const openNotificationRef = useRef(openNotification);

    // Actualizar refs sem causar re-renders
    useEffect(() => { apiConfigRef.current = apiConfig; });
    useEffect(() => { defaultSortRef.current = defaultSort; });
    useEffect(() => { pageSizeRef.current = pageSize; });
    useEffect(() => { openNotificationRef.current = openNotification; });

    const patchRow = useCallback((matchFn, updatedData) => {
        setRows(prev => prev.map(row => matchFn(row) ? { ...row, ...updatedData } : row));
    }, []);

    useEffect(() => {
        if (onRegisterPatch) onRegisterPatch(patchRow);
    }, [onRegisterPatch, patchRow]);

    const fetchData = useCallback(async (page = 1, filtersToUse = {}) => {
        const cfg = apiConfigRef.current;
        const sort = defaultSortRef.current;
        const pgSize = pageSizeRef.current;
        const notify = openNotificationRef.current;
        const fields = filterFieldsRef.current;  // ADD

        // criar Set de campos exactos
        const exactFields = new Set(
            fields.filter(f => f.exact).map(f => f.name)
        );

        setIsLoading(true);
        try {
            const filterPayload = { tstamp: Date.now() };

            // defaultFilter (fixos)
            if (cfg.defaultFilter) {
                Object.entries(cfg.defaultFilter).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        filterPayload[key] = value;
                    }
                });
            }

            //  filtros do utilizador
            Object.keys(filtersToUse).forEach(key => {
                const value = filtersToUse[key];

                if (key === 'fdata' && Array.isArray(value) && value.length === 2) {
                    let startDate, endDate;
                    if (typeof value[0] === 'string') {
                        startDate = value[0];
                        endDate = value[1];
                    } else if (value[0]?.format) {
                        startDate = value[0].format(DATE_FORMAT);
                        endDate = value[1].format(DATE_FORMAT);
                    }
                    if (startDate && endDate) {
                        filterPayload.fdata = [`>=${startDate} 00:00:00`, `<=${endDate} 23:59:59`];
                    }
                } else if (value && typeof value === 'string') {
                    // se o campo é exact, enviar o valor tal como está
                    if (exactFields.has(key)) {
                        filterPayload[key] = value;
                    } else {
                        filterPayload[key] = value.includes('%') ? value : `%${value}%`;
                    }
                } else if (value !== undefined && value !== null && value !== '') {
                    filterPayload[key] = value;
                }
            });

            //  extraFilter (contexto auth/permissões)
            if (cfg.extraFilter) {
                Object.assign(filterPayload, cfg.extraFilter);
            }

            const response = await fetchPost({
                url: cfg.url,
                withCredentials: true,
                parameters: { method: cfg.method },
                filter: filterPayload,
                pagination: { enabled: true, page, pageSize: pgSize },
                sort: sort
            });

            if (response?.data?.status === "success") {
                setRows(response.data.rows || []);
                setTotal(response.data.total || 0);
                setCurrentPage(page);
            } else {
                notify?.("error", "top", "Erro", response?.data?.title || "Erro ao carregar dados");
            }
        } catch (error) {
            openNotificationRef.current?.("error", "top", "Erro", error.message);
        } finally {
            setIsLoading(false);
        }
    }, []); // ← array vazio: fetchData nunca muda de referência

    const handleApplyFilters = (values) => {
        const processedValues = { ...values };
        if (values.fdata && typeof values.fdata === 'object' && values.fdata.formatted) {
            const { startValue, endValue } = values.fdata.formatted;
            processedValues.fdata = (startValue && endValue) ? [startValue, endValue] : undefined;
        }
        setActiveFilters(processedValues);
        setCurrentPage(1);
        fetchData(1, processedValues);
        setShowFilters(false);
    };

    const handleClearFilters = () => {
        formFilter.resetFields();
        setActiveFilters({});
        setCurrentPage(1);
        fetchData(1, {});
    };

    // Carregar apenas uma vez ao montar
    useEffect(() => {
        fetchData(1, {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const activeFilterCount = Object.keys(activeFilters).filter(key => {
        const val = activeFilters[key];
        return val && val !== '' && (!Array.isArray(val) || val.length > 0);
    }).length;

    const renderCell = (column, row, rowIndex) => {
        if (column.render) return column.render(row[column.dataIndex], row, rowIndex);
        return row[column.dataIndex] ?? <span className="text-slate-300">—</span>;
    };

    const renderToolbarButtons = () => {
        if (!toolbarButtons) return null;
        return typeof toolbarButtons === 'function' ? toolbarButtons(activeFilters) : toolbarButtons;
    };

    const totalPages = Math.ceil(total / pageSize) || 1;
    const startRecord = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, total);

    return (
        <div className="flex flex-col h-full gap-3">
            {/* Toolbar */}
            <div className="flex flex-wrap justify-between items-center bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {filterFields.length > 0 && (
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all
                                ${activeFilterCount > 0 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <FilterOutlined />
                            Filtros
                            {activeFilterCount > 0 && (
                                <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    )}
                    {renderToolbarButtons()}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                        {total > 0 ? `${startRecord}–${endRecord} de ${total}` : '0 resultados'}
                    </span>
                    {activeFilterCount > 0 && (
                        <span className="text-[11px] text-blue-600 font-bold">
                            ({activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''})
                        </span>
                    )}
                </div>
            </div>


           {/* Painel de filtros — sempre montado, visibilidade controlada por CSS */}
            {filterFields.length > 0 && (
                <div
                    className={`bg-white px-4 py-3 rounded-xl shadow-sm border border-blue-100 transition-all ${
                        showFilters ? 'block' : 'hidden'
                    }`}
                >
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Filtros de pesquisa</p>
                    <Form form={formFilter} layout="inline" onFinish={handleApplyFilters} initialValues={activeFilters} className="flex flex-wrap gap-3 items-end">
                        {filterFields.map(field => (
                            <Form.Item
                                key={field.name}
                                name={field.name}
                                label={<span className="text-xs font-semibold text-slate-600">{field.label}</span>}
                                className="mb-0"
                            >
                                {field.component || <Input placeholder={field.placeholder} size="middle" style={{ width: field.width || 180 }} />}
                            </Form.Item>
                        ))}
                        <div className="flex gap-2">
                            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
                                <SearchOutlined /> Aplicar
                            </button>
                            <button type="button" onClick={handleClearFilters} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all">
                                <ClearOutlined /> Limpar
                            </button>
                        </div>
                    </Form>
                </div>
            )}

            {/* Tabela */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap
                                            ${col.sticky ? 'sticky bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0]' : ''} ${col.className || ''}`}
                                        style={col.style}
                                    >
                                        {typeof col.title === 'function' ? col.title() : col.title}
                                    </th>
                                ))}
                                {onRowEdit && (
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">
                                        Ação
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.length + (onRowEdit ? 1 : 0)} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm text-slate-400 font-medium">A carregar registos...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : rows.length > 0 ? (
                                rows.map((row, idx) => (
                                    <tr key={idx} className={rowClassName ? rowClassName(row, idx) : "hover:bg-blue-50/40 transition-colors group"}>
                                        {columns.map((col, colIdx) => (
                                            <td
                                                key={colIdx}
                                                className={`px-4 py-3 text-sm
                                                    ${col.sticky ? 'sticky bg-white group-hover:bg-blue-50/40 shadow-[1px_0_0_0_#e2e8f0] z-[5]' : ''}
                                                    ${col.cellClassName || ''}`}
                                                style={col.cellStyle}
                                            >
                                                {renderCell(col, row, idx)}
                                            </td>
                                        ))}
                                        {onRowEdit && (
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => onRowEdit(row)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <EditOutlined />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length + (onRowEdit ? 1 : 0)} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <SearchOutlined className="text-4xl text-slate-200" />
                                            <p className="text-sm font-semibold text-slate-400">Nenhum registo encontrado</p>
                                            {activeFilterCount > 0 && <p className="text-xs text-slate-400">Tente alterar os filtros de pesquisa</p>}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                <div className="shrink-0 px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
                    <span className="text-[11px] text-slate-500 font-medium">
                        {total > 0
                            ? <>Mostrando <span className="font-bold text-slate-700">{startRecord}–{endRecord}</span> de <span className="font-bold text-slate-700">{total}</span> registos</>
                            : 'Sem registos'}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => fetchData(currentPage - 1, activeFilters)}
                            disabled={currentPage === 1 || isLoading}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            ← Anterior
                        </button>
                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) pageNum = i + 1;
                                else if (currentPage <= 3) pageNum = i + 1;
                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = currentPage - 2 + i;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => fetchData(pageNum, activeFilters)}
                                        disabled={isLoading}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                                            ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => fetchData(currentPage + 1, activeFilters)}
                            disabled={currentPage >= totalPages || isLoading}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Próximo →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataTable;