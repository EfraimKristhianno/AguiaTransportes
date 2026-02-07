import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Clock, Package, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DriverRequest } from '@/hooks/useDriverRequests';
import { UnifiedRequestDetailsDialog } from '@/components/shared/UnifiedRequestDetailsDialog';

interface DriverRequestsTableProps {
  requests: DriverRequest[];
  isLoading: boolean;
  driverId: string;
}

export const DriverRequestsTable = ({
  requests,
  isLoading,
  driverId,
}: DriverRequestsTableProps) => {
  const [selectedRequest, setSelectedRequest] = useState<DriverRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      solicitada: {
        label: 'Solicitada',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      enviada: {
        label: 'Solicitada',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
    };
    const config = statusConfig[status || 'solicitada'] || statusConfig.solicitada;
    return (
      <Badge variant="outline" className={`${config.className} flex items-center w-fit`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const handleViewDetails = (request: DriverRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Solicitações Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Transporte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Nenhuma solicitação disponível no momento
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <span className="font-mono font-bold text-primary">
                          #{String(request.request_number || '').padStart(6, '0')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {request.clients?.name || 'Não informado'}
                          </span>
                          {request.clients?.phone && (
                            <p className="text-sm text-muted-foreground">
                              {request.clients.phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{request.transport_type || '-'}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {formatDate(request.scheduled_date || request.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3 p-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Package className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground text-center">
                  Nenhuma solicitação disponível no momento
                </p>
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-bold text-primary">
                      #{String(request.request_number || '').padStart(6, '0')}
                    </span>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">
                      {request.clients?.name || 'Não informado'}
                    </span>
                    {request.clients?.phone && (
                      <p className="text-sm text-muted-foreground">
                        {request.clients.phone}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-muted-foreground">Transporte</p>
                      <p className="font-medium">{request.transport_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {formatDate(request.scheduled_date || request.created_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewDetails(request)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalhes
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <UnifiedRequestDetailsDialog
        request={selectedRequest}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        driverId={driverId}
      />
    </>
  );
};
