import { useState, useMemo, useCallback } from 'react';
import { FileText } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { RequestForm } from '@/components/solicitacoes/RequestForm';
import { RequestList } from '@/components/solicitacoes/RequestList';
import { useAuth } from '@/contexts/AuthContext';
import { RequestSearchBar, filterRequestsBySearch } from '@/components/shared/RequestSearchBar';
import { useRealtimeDeliveryRequests } from '@/hooks/useRealtimeDeliveryRequests';
import { useDeliveryRequests } from '@/hooks/useDeliveryRequests';
import { useAllFreightPrices, getFreightPricesForRequest, formatSingleFreightPrice } from '@/hooks/useFreightPrices';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoAguia from '@/assets/logo-aguia.png';

const Solicitacoes = () => {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  useRealtimeDeliveryRequests();
  const { data: requests = [] } = useDeliveryRequests();
  const { data: allPrices = [] } = useAllFreightPrices();

  const filteredRequests = useMemo(() => {
    return filterRequestsBySearch(requests, searchTerm, statusFilter, dateFrom, dateTo);
  }, [requests, searchTerm, statusFilter, dateFrom, dateTo]);

  const handleDownloadPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo no canto superior direito
    try {
      doc.addImage(logoAguia, 'PNG', pageWidth - 45, 6, 35, 18);
    } catch {}

    // Título e info à esquerda
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Solicitações', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateLabel = dateFrom || dateTo
      ? `Período: ${dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : '...'} até ${dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: ptBR }) : '...'}`
      : 'Todas as datas';
    doc.text(dateLabel, 14, 23);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 29);

    // Indicadores resumo
    const totalRequests = filteredRequests.length;
    const totalFreightValue = filteredRequests.reduce((sum: number, item: any) => {
      const matched = getFreightPricesForRequest(allPrices, item.client_id, item.transport_type, item.region);
      const priceText = formatSingleFreightPrice(matched);
      const numVal = priceText !== '-' ? parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.')) : 0;
      return sum + (isNaN(numVal) ? 0 : numVal);
    }, 0);
    const statusCounts: Record<string, number> = {};
    filteredRequests.forEach((r: any) => {
      const s = r.status || 'solicitada';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    autoTable(doc, {
      startY: 35,
      head: [['Total Solicitações', 'Valor Total Frete', ...Object.keys(statusCounts).map(s => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' '))]],
      body: [[
        totalRequests.toString(),
        `R$ ${totalFreightValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ...Object.values(statusCounts).map(v => v.toString()),
      ]],
      theme: 'grid',
      headStyles: { fillColor: [211, 33, 39], fontSize: 8 },
      bodyStyles: { fontSize: 8, fontStyle: 'bold' },
      margin: { left: 14 },
    });

    let y = (doc as any).lastAutoTable.finalY + 8;

    // Tabela detalhada
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento', 14, y);
    y += 3;

    const formatDate = (d: string | null) => {
      if (!d) return '-';
      return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    };

    const getFreightValue = (item: any): string => {
      const matched = getFreightPricesForRequest(allPrices, item.client_id, item.transport_type, item.region);
      return formatSingleFreightPrice(matched);
    };

    const tableData = filteredRequests.map((item: any) => [
      formatDate(item.scheduled_date || item.created_at),
      item.clients?.name || '-',
      item.transport_type || '-',
      item.origin_address || '-',
      item.destination_address || '-',
      item.requester || '-',
      getFreightValue(item),
    ]);

    autoTable(doc, {
      head: [['Data/Hora', 'Cliente', 'Tipo Transporte', 'End. Coleta', 'End. Entrega', 'Solicitante', 'Valor Frete']],
      body: tableData,
      startY: y,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [211, 33, 39], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        3: { cellWidth: 50 },
        4: { cellWidth: 50 },
      },
      margin: { left: 14 },
    });

    doc.save(`solicitacoes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }, [filteredRequests, dateFrom, dateTo, allPrices]);

  return (
    <DashboardLayout
      title="Solicitações"
      subtitle={role === 'cliente' ? "Crie e acompanhe suas solicitações de coleta" : "Gerencie as solicitações de coleta"}
      icon={<FileText className="h-5 w-5" />}
    >
      <div className="flex flex-col gap-4 md:gap-6">
        <RequestForm />

        <RequestSearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onDownloadPdf={handleDownloadPdf}
        />

        <div className="min-h-[300px] md:h-[500px]">
          <RequestList searchTerm={searchTerm} statusFilter={statusFilter} dateFrom={dateFrom} dateTo={dateTo} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Solicitacoes;
