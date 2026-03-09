import React, { useContext } from 'react';
import dayjs from 'dayjs';
import { Tag } from 'antd';
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
                    <Tag color={tagColor} className="font-bold text-sm px-3 py-1">
                        {tag}
                    </Tag>
                )}
            </div>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

export default function RegistosRHPessoal() {
    const { auth }             = useContext(AppContext);
    const { openNotification } = useContext(LayoutContext);

    const columns = [
        {
            title: 'Data',
            dataIndex: 'dts',
            style: { minWidth: 100 },
            render: (val) => (
                <span className="inline-flex items-center gap-1 text-xs
                                 text-slate-600 bg-slate-50 px-2 py-1
                                 rounded-lg font-medium whitespace-nowrap">
                    {dayjs(val).format('DD/MM/YYYY')}
                </span>
            )
        },
        {
            title: 'Picagens',
            dataIndex: 'nt',
            style: { minWidth: 80, textAlign: 'center' },
            render: (val) => (
                <span className="inline-flex items-center justify-center
                                 w-7 h-7 bg-blue-50 text-blue-700
                                 rounded-lg text-xs font-bold">
                    {val || 0}
                </span>
            )
        },
        ...[...Array(8)].map((_, i) => ({
            title: `P${i + 1}`,
            dataIndex: `ss_${String(i + 1).padStart(2, '0')}`,
            style: { minWidth: 90, textAlign: 'center' },
            render: (val, row) => {
                const typeVal = row[`ty_${String(i + 1).padStart(2, '0')}`];
                const type    = typeVal ? String(typeVal).trim().toLowerCase() : null;
                return val ? (
                    <div className={`inline-flex items-center gap-1 px-2 py-1
                        rounded-lg text-[10px] font-bold whitespace-nowrap
                        ${type === 'in'
                            ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                            : type === 'out'
                                ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                : 'bg-slate-50 text-slate-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full
                            ${type === 'in'
                                ? 'bg-green-500'
                                : type === 'out'
                                    ? 'bg-red-500'
                                    : 'bg-slate-400'}`} />
                        {dayjs(val).format('HH:mm')}
                    </div>
                ) : <span className="text-slate-300 text-[10px]">—</span>;
            }
        }))
    ];

    const filterFields = [
        {
            name:      'fdata',
            label:     'Período',
            component: <RangeDateField size="middle" />
        }
    ];

    const apiConfig = {
        url:    `${API_URL}/rponto/sqlp/`,
        method: 'RegistosRH',

        // extraFilter is always merged into the filter sent to the backend.
        // 'num' → read by the backend as num_auth (identity, not a search param).
        // isRH/isChefe: false → forces the "colaborador normal" path in RegistosRH,
        //   which adds  "TR.num = %(num_auth)s"  to the WHERE clause.
        extraFilter: {
            isRH:       false,
            isAdmin:    false,
            isChefe:    false,
            deps_chefe: [],
            num:        auth?.num ?? '',   // identity sent as filter_data['num']
        },
    };

    const defaultSort = [
        { column: 'dts', direction: 'DESC' },
        { column: 'num', direction: 'ASC'  },
    ];

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title="As Minhas Picagens"
                subtitle="Os seus registos pessoais de picagens"
                tag={`${auth?.first_name || ''} ${auth?.last_name || ''}`.trim() || auth?.num}
                tagColor="green"
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