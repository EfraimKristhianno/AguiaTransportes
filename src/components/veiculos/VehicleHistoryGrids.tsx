import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Eye, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { VehicleLog, OilChangeRecord, MaintenanceRecord, useDeleteVehicleLog, useDeleteOilChange, useDeleteMaintenanceRecord } from '@/hooks/useVehicleLogs';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoAguiaPdf from '@/assets/logo-aguia-pdf.png';

const fuelTypeLabel: Record<string, string> = {
  diesel: 'Diesel',
  gasolina: 'Gasolina',
  gnv: 'Gás (GNV)',
  alcool: 'Álcool',
};

const maintenanceTypeLabel: Record<string, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
  preditiva: 'Preditiva',
};

interface Props {
  filteredLogs: VehicleLog[];
  filteredOilRecords: OilChangeRecord[];
  filteredMaintenanceRecords: MaintenanceRecord[];
  allVehicles: any[];
}

const VehicleHistoryGrids = ({ filteredLogs, filteredOilRecords, filteredMaintenanceRecords, allVehicles }: Props) => {
  const deleteLog = useDeleteVehicleLog();
  const deleteOil = useDeleteOilChange();
  const deleteMaint = useDeleteMaintenanceRecord();

  const handleDeleteLog = (id: string) => {
    if (confirm('Deseja excluir este registro de abastecimento?')) deleteLog.mutate(id);
  };
  const handleDeleteOil = (id: string) => {
    if (confirm('Deseja excluir este registro de troca de óleo?')) deleteOil.mutate(id);
  };
  const handleDeleteMaint = (id: string) => {
    if (confirm('Deseja excluir este registro de manutenção?')) deleteMaint.mutate(id);
  };

  const getVehicleType = (vehicleId: string) => {
    const v = allVehicles.find((v: any) => v.id === vehicleId);
    return v?.type || '-';
  };

  const handleExportAllPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo
    try { doc.addImage(logoAguiaPdf, 'PNG', pageWidth - 55, 4, 50, 22); } catch {}

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Completo de Registros', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 23);

    let y = 32;

    // Fuel logs
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Histórico de Registros (Combustível)', 14, y);
    y += 3;

    if (filteredLogs.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Veículo', 'Placa', 'Km Atual', 'Combustível', 'Litros', 'R$/L', 'Total']],
        body: filteredLogs.map(l => [
          format(new Date(l.log_date), 'dd/MM/yyyy'),
          getVehicleType(l.vehicle_id),
          l.vehicle_plate || '-',
          l.km_final?.toLocaleString('pt-BR') || '-',
          fuelTypeLabel[l.fuel_type] || l.fuel_type,
          l.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-',
          l.fuel_price ? `R$ ${l.fuel_price.toFixed(2)}` : '-',
          l.total_cost ? `R$ ${l.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [211, 33, 39], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('Nenhum registro.', 14, y + 4); y += 12;
    }

    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }

    // Oil
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Histórico de Troca de Óleo', 14, y);
    y += 3;

    if (filteredOilRecords.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Veículo', 'Placa', 'Km na Troca', 'Próx. Troca', 'Tipo Óleo', 'Custo']],
        body: filteredOilRecords.map(o => [
          format(new Date(o.change_date), 'dd/MM/yyyy'),
          getVehicleType(o.vehicle_id),
          o.vehicle_plate || '-',
          o.km_at_change.toLocaleString('pt-BR'),
          o.next_change_km.toLocaleString('pt-BR'),
          o.oil_type || '-',
          o.service_cost ? `R$ ${o.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [211, 33, 39], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('Nenhum registro.', 14, y + 4); y += 12;
    }

    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }

    // Maintenance
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Histórico de Manutenção', 14, y);
    y += 3;

    if (filteredMaintenanceRecords.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Veículo', 'Placa', 'Tipo', 'Km Atual', 'Custo']],
        body: filteredMaintenanceRecords.map(m => [
          format(new Date(m.maintenance_date), 'dd/MM/yyyy'),
          getVehicleType(m.vehicle_id),
          m.vehicle_plate || '-',
          maintenanceTypeLabel[m.maintenance_type] || m.maintenance_type,
          m.current_km.toLocaleString('pt-BR'),
          m.service_cost ? `R$ ${m.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [211, 33, 39], fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        margin: { left: 14 },
      });
    } else {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('Nenhum registro.', 14, y + 4);
    }

    doc.save(`registros-veiculos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <Button onClick={handleExportAllPDF} variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Exportar Todos os Registros (PDF)
        </Button>
      </div>

      {/* Fuel History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro de abastecimento.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Km Atual</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead>Litros</TableHead>
                    <TableHead>R$/L</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.log_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{log.vehicle?.type || getVehicleType(log.vehicle_id)}</TableCell>
                      <TableCell>{log.vehicle_plate || '-'}</TableCell>
                      <TableCell className="font-medium">{log.km_final?.toLocaleString('pt-BR') || '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{fuelTypeLabel[log.fuel_type] || log.fuel_type}</Badge></TableCell>
                      <TableCell>{log.liters?.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) || '-'}</TableCell>
                      <TableCell>{log.fuel_price ? `R$ ${log.fuel_price.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="font-medium">{log.total_cost ? `R$ ${log.total_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteLog(log.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Oil Change History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Troca de Óleo</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOilRecords.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro de troca de óleo.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Km na Troca</TableHead>
                    <TableHead>Próx. Troca</TableHead>
                    <TableHead>Tipo Óleo</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOilRecords.map(oil => (
                    <TableRow key={oil.id}>
                      <TableCell>{format(new Date(oil.change_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{oil.vehicle?.type || getVehicleType(oil.vehicle_id)}</TableCell>
                      <TableCell>{oil.vehicle_plate || '-'}</TableCell>
                      <TableCell>{oil.km_at_change.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{oil.next_change_km.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{oil.oil_type || '-'}</TableCell>
                      <TableCell className="font-medium">{oil.service_cost ? `R$ ${oil.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteOil(oil.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Manutenção</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMaintenanceRecords.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro de manutenção.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Km Atual</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaintenanceRecords.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{format(new Date(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{m.vehicle?.type || getVehicleType(m.vehicle_id)}</TableCell>
                      <TableCell>{m.vehicle_plate || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={m.maintenance_type === 'corretiva' ? 'destructive' : m.maintenance_type === 'preventiva' ? 'default' : 'secondary'}>
                          {maintenanceTypeLabel[m.maintenance_type] || m.maintenance_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.current_km.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="font-medium">{m.service_cost ? `R$ ${m.service_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteMaint(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VehicleHistoryGrids;
