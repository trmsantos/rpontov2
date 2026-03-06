import React, { useContext } from 'react';
import dayjs from 'dayjs';
import { Input, Tag } from 'antd';
import { API_URL } from "config";
import { RangeDateField } from 'components/FormFields';
import { AppContext } from './App';
import { LayoutContext } from "./GridLayout";
import DataTable from './DataTable';

const PageHeader = ({ title, subtitle, tag, tagColor = 'blue' }) => (
    <div className="flex items-center justify-between mb-6">
        <div>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-800">{title}</h1>
                {tag && (
                    <Tag color={tagColor} className="font-bold text-sm px-3 py-1">{tag}</Tag>
                )}
            </div>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

export default function RegistosRHChefe() {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);

    const isRH       = auth?.isRH       || false;
    const isChefe    = auth?.isChefe     || false;
    const deps_chefe = auth?.deps_chefe  || [];
    const isColab    = !isRH && !isChefe;

    // ✅ Debug — confirma o papel
    console.log('[RegistosRHChefe]', { isRH, isChefe, isColab, deps_chefe, num: auth?.num });

    const title = isRH
        ? 'Registo de Picagens'
        : isChefe
            ? 'Picagens do Departamento'
            : 'As Minhas Picagens';

    const subtitle = isRH
        ? 'Todos os colaboradores'
        : isChefe
            ? `Departamento(s): ${deps_chefe.join(', ')}`
            : 'Os seus registos pessoais';

    const tag = isRH
        ? 'Todos os departamentos'
        : isChefe
            ? deps_chefe.join(', ')
            : `${auth?.first_name || ''} ${auth?.last_name || ''}`.trim();

    const colColaborador = {
        title: 'Colaborador', dataIndex: 'num', sticky: true,
        style: { minWidth: 180 },
        render: (val, row) => (
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700
                                text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                    {String(val).slice(-2)}
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-xs truncate">
                        {row.nome_colaborador || `Nº ${val}`}
                    </p>
                    <p className="text-[10px] text-slate-400">Nº {val}</p>
                </div>
            </div>
        )
    };

    const colDepartamento = {
        title: 'Departamento', dataIndex: 'dep',
        style: { minWidth: 100 },
        render: (val) => <Tag color="blue" className="font-semibold text-xs">{val || '—'}</Tag>
    };

    const colData = {
        title: 'Data', dataIndex: 'dts',
        style: { minWidth: 100 },
        render: (val) => (
            <span className="inline-flex items-center gap-1 text-xs text-slate-600
                             bg-slate-50 px-2 py-1 rounded-lg font-medium whitespace-nowrap">
                {dayjs(val).format('DD/MM/YYYY')}
            </span>
        )
    };

    const colPicagens = {
        title: 'Picagens', dataIndex: 'nt',
        style: { minWidth: 80, textAlign: 'center' },
        render: (val) => (
            <span className="inline-flex items-center justify-center w-7 h-7
                             bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                {val || 0}
            </span>
        )
    };

    const colsPx = [...Array(8)].map((_, i) => ({
        title: `P${i + 1}`,
        dataIndex: `ss_${String(i + 1).padStart(2, '0')}`,
        style: { minWidth: 90, textAlign: 'center' },
        render: (val, row) => {
            const typeVal = row[`ty_${String(i + 1).padStart(2, '0')}`];
            const type    = typeVal ? String(typeVal).trim().toLowerCase() : null;
            return val ? (
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg
                    text-[10px] font-bold whitespace-nowrap
                    ${type === 'in'  ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                    : type === 'out' ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                    :                  'bg-slate-50 text-slate-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full
                        ${type === 'in' ? 'bg-green-500' : type === 'out' ? 'bg-red-500' : 'bg-slate-400'}`} />
                    {dayjs(val).format('HH:mm')}
                </div>
            ) : <span className="text-slate-300 text-[10px]">—</span>;
        }
    }));

    const columns = [
        ...(!isColab ? [colColaborador, colDepartamento] : []),
        colData, colPicagens, ...colsPx
    ];

    const filterFields = [
        ...(!isColab ? [{
            name: 'fnum', label: 'Número',
            component: <Input placeholder="Ex: F00016" size="middle" style={{ width: 130 }} />
        }] : []),
        { name: 'fdata', label: 'Período', component: <RangeDateField size="middle" /> }
    ];

    // ✅ CORRIGIDO: extraFilter passa SEMPRE os dados do papel
    const extraFilter = {
        isRH,
        isChefe,
        deps_chefe,   // ← ["DPLAN"] para chefe do DPLAN
    };

    // ✅ CORRIGIDO: defaultFilter força fnum só para colaborador
    const defaultFilter = isColab
        ? { fnum: auth?.num }
        : {};

    const apiConfig = {
        url:    `${API_URL}/rponto/sqlp/`,
        method: 'RegistosRH',
        extraFilter,
        defaultFilter,
    };

    const defaultSort = [
        { column: "dts", direction: "DESC" },
        { column: "num", direction: "ASC"  }
    ];

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title={title} subtitle={subtitle} tag={tag}
                tagColor={isRH ? 'purple' : isChefe ? 'blue' : 'green'}
            />
            <div className="flex-1 min-h-0">
                <DataTable
                    columns={columns}
                    apiConfig={apiConfig}
                    filterFields={filterFields}
                    defaultSort={defaultSort}
                    pageSize={20}
                    openNotification={openNotification}
                />
            </div>
        </div>
    );
}