import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender
} from '@tanstack/react-table';

export default function SortableTable({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
  defaultSortField,
  defaultSortDesc = false,
  footerRow = null,
}) {
  const [sorting, setSorting] = React.useState(
    defaultSortField ? [{ id: defaultSortField, desc: defaultSortDesc }] : []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <div className={`overflow-x-auto rounded-xl border border-border ${className}`}>
      <table className="w-full min-w-max">
        <thead className="bg-surface">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className={`table-header ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-white transition-colors' : ''}`}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1.5">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <span className="text-muted/60">
                        {header.column.getIsSorted() === 'asc' ? '↑' :
                         header.column.getIsSorted() === 'desc' ? '↓' : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-muted py-12 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className={`border-b border-border/50 transition-colors ${onRowClick ? 'table-row-hover' : 'hover:bg-surface/50'}`}
                onClick={() => onRowClick && onRowClick(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="table-cell">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
          {footerRow}
        </tbody>
      </table>
    </div>
  );
}
