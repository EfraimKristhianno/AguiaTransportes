import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { VehicleLog, OilChangeRecord, MaintenanceRecord } from '@/hooks/useVehicleLogs';
import logoAguia from '@/assets/logo-aguia.png';

interface Vehicle {
  id: string;
  plate: string;
  type: string;
  status?: string | null;
}

interface Props {
  vehicles: Vehicle[];
  logs: VehicleLog[];
  oilRecords: OilChangeRecord[];
  maintenanceRecords: MaintenanceRecord[];
}

const maintenanceTypeLabel: Record<string, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
  preditiva: 'Preditiva',
};

const VehicleExportPDF = ({ vehicles, logs, oilRecords, maintenanceRecords }: Props) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');

  const handleExport = () => {
    const filteredVehicles = selectedVehicleId === 'all'
      ? vehicles
      : vehicles.filter(v => v.id === selectedVehicleId);

    if (filteredVehicles.length === 0) {
      toast.error('Nenhum veículo encontrado.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let isFirstPage = true;

    const addHeader = (vehiclePlate: string) => {
      if (!isFirstPage) doc.addPage();
      isFirstPage = false;

      // Logo no canto superior esquerdo
      try {
        doc.addImage(logoAguia, 'PNG', 10, 6, 35, 18);
      } catch {}

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Veículo', 50, 16);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Veículo: ${vehiclePlate}`, 50, 23);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 50, 29);
    };

    filteredVehicles.forEach(vehicle => {
      const vLogs = logs.filter(l => l.vehicle_id === vehicle.id);
      const vOil = oilRecords.filter(o => o.vehicle_id === vehicle.id);
      const vMaint = maintenanceRecords.filter(m => m.vehicle_id === vehicle.id);

      // Indicators
      const totalKm = vLogs.reduce((a, l) => a + (l.km_total || 0), 0);
      const totalLiters = vLogs.reduce((a, l) => a + (l.liters || 0), 0);
      const totalFuelCost = vLogs.reduce((a, l) => a + (l.total_cost || 0), 0);
      const avgKmL = totalLiters > 0 ? (totalKm / totalLiters).toFixed(1) : '-';
      const totalMaintCost = vMaint.reduce((a, m) => a + (m.service_cost || 0), 0);
      const totalGeneral = totalFuelCost + totalMaintCost;

      addHeader(vehicle.plate);

      // Indicators table
      let y = 35;
      autoTable(doc, {
        startY: y,
        head: [['Km Total', 'Litros', 'Gasto Comb.', 'Média Km/L', 'Manutenções', 'Gasto Manut.', 'Gasto Total']],
        body: [[
          totalKm.toLocaleString('pt-BR'),
          totalLiters.toLocaleString('pt-BR', { minimumFractionDigits: 1 }),
          `R$ ${totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          avgKmL,
          vMaint.length.toString(),
          `R$ ${totalMaintCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${totalGeneral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        ]],
        theme: 'grid',
        headStyles: { fillColor: [211, 33, 39], fontSize: 8 },
        bodyStyles: { fontSize: 8, fontStyle: 'bold' },
        margin: { left: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // Fuel logs
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Abastecimentos', 14, y);
      y += 3;

      if (vLogs.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Data', 'Motorista', 'Km Inicial', 'Km Final', 'Km Total', 'Combustível', 'Litros', 'Preço/L', 'Total']],
          body: vLogs.map(l => [
            format(new Date(l.log_date), 'dd/MM/yyyy'),
            l.driver?.name || '-',
            l.km_initial?.toLocaleString('pt-BR') || '-',
            l.km_final?.toLocaleString('pt-BR') || '-',
            l.km_total?.toLocaleString('pt-BR') || '-',
            l.fuel_type,
            l.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-',
            l.fuel_price ? `R$ ${l.fuel_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
            l.total_cost ? `R$ ${l.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [211, 33, 39], fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          margin: { left: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      } else {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Nenhum registro.', 14, y + 4);
        y += 12;
      }

      // Check if need new page
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 20;
      }

      // Oil changes
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Trocas de Óleo', 14, y);
      y += 3;

      if (vOil.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Data', 'Motorista', 'Km na Troca', 'Próx. Troca', 'Tipo Óleo', 'Observação']],
          body: vOil.map(o => [
            format(new Date(o.change_date), 'dd/MM/yyyy'),
            o.driver?.name || '-',
            o.km_at_change.toLocaleString('pt-BR'),
            o.next_change_km.toLocaleString('pt-BR'),
            o.oil_type || '-',
            o.notes || '-',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [211, 33, 39], fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          margin: { left: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      } else {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Nenhum registro.', 14, y + 4);
        y += 12;
      }

      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 20;
      }

      // Maintenance
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Manutenções', 14, y);
      y += 3;

      if (vMaint.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Data', 'Tipo', 'Motorista', 'Placa', 'Km Atual', 'Custo', 'Observação']],
          body: vMaint.map(m => [
            format(new Date(m.maintenance_date), 'dd/MM/yyyy'),
            maintenanceTypeLabel[m.maintenance_type] || m.maintenance_type,
            m.driver?.name || '-',
            m.vehicle_plate,
            m.current_km.toLocaleString('pt-BR'),
            m.service_cost ? `R$ ${m.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
            m.notes || '-',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [211, 33, 39], fontSize: 7 },
          bodyStyles: { fontSize: 7 },
          margin: { left: 14 },
        });
      } else {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Nenhum registro.', 14, y + 4);
      }
    });

    const fileName = selectedVehicleId === 'all'
      ? `relatorio-frota-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      : `relatorio-${filteredVehicles[0]?.plate}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    doc.save(fileName);
    toast.success('PDF exportado com sucesso!');
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Selecionar veículo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os veículos</SelectItem>
          {vehicles.map(v => (
            <SelectItem key={v.id} value={v.id}>{v.type}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleExport} variant="outline" className="gap-2">
        <FileDown className="h-4 w-4" />
        Exportar PDF
      </Button>
    </div>
  );
};

export default VehicleExportPDF;
