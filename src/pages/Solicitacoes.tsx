import { useState, useMemo, useCallback } from 'react';
import { FileText } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { RequestForm } from '@/components/solicitacoes/RequestForm';
import { RequestList } from '@/components/solicitacoes/RequestList';
import { useAuth } from '@/contexts/AuthContext';
import { RequestSearchBar, filterRequestsBySearch } from '@/components/shared/RequestSearchBar';
import { useRealtimeDeliveryRequests } from '@/hooks/useRealtimeDeliveryRequests';
import { useDeliveryRequests } from '@/hooks/useDeliveryRequests';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Solicitacoes = () => {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  useRealtimeDeliveryRequests();
  const { data: requests = [] } = useDeliveryRequests();

  const filteredRequests = useMemo(() => {
    return filterRequestsBySearch(requests, searchTerm, statusFilter, dateFrom, dateTo);
  }, [requests, searchTerm, statusFilter, dateFrom, dateTo]);

  const handleDownloadPdf = useCallback(() => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Solicitações', 14, 20);
    doc.setFontSize(10);
    const dateLabel = dateFrom || dateTo
      ? `Período: ${dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : '...'} até ${dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: ptBR }) : '...'}`
      : 'Todas as datas';
    doc.text(dateLabel, 14, 28);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 34);

    const formatDate = (d: string | null) => {
      if (!d) return '-';
      return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR });
    };

    const tableData = filteredRequests.map((item: any) => [
      `#${String(item.request_number || '').padStart(6, '0')}`,
      item.clients?.name || '-',
      item.material_types?.name || '-',
      item.status || '-',
      formatDate(item.scheduled_date || item.created_at),
    ]);

    autoTable(doc, {
      head: [['ID', 'Cliente', 'Material', 'Status', 'Data']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 38, 38] },
    });

    doc.save('solicitacoes.pdf');
  }, [filteredRequests, dateFrom, dateTo]);

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
