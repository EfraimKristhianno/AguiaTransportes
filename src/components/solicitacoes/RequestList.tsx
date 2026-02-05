 import { useState } from 'react';
 import { Search, Filter, Clock, Package } from 'lucide-react';
 import { Input } from '@/components/ui/input';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { useDeliveryRequests } from '@/hooks/useDeliveryRequests';
 import { format } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 
 const STATUS_OPTIONS = [
   { value: 'all', label: 'Todos' },
   { value: 'enviada', label: 'Enviada' },
   { value: 'aceita', label: 'Aceita' },
   { value: 'coletada', label: 'Coletada' },
   { value: 'entregue', label: 'Entregue' },
 ];
 
 const getStatusBadgeVariant = (status: string | null) => {
   switch (status) {
     case 'enviada':
       return 'outline';
     case 'aceita':
       return 'secondary';
     case 'coletada':
       return 'default';
     case 'entregue':
       return 'default';
     default:
       return 'outline';
   }
 };
 
 const getStatusLabel = (status: string | null) => {
   switch (status) {
     case 'enviada':
       return 'Enviado';
     case 'aceita':
       return 'Aceito';
     case 'coletada':
       return 'Coletado';
     case 'entregue':
       return 'Entregue';
     default:
       return status || 'Pendente';
   }
 };
 
 export const RequestList = () => {
   const [searchTerm, setSearchTerm] = useState('');
   const [statusFilter, setStatusFilter] = useState('all');
 
   const { data: requests = [], isLoading } = useDeliveryRequests(
     statusFilter === 'all' ? null : statusFilter
   );
 
   const filteredRequests = requests.filter((request) => {
     const materialName = request.material_types?.name?.toLowerCase() || '';
     const clientName = request.clients?.name?.toLowerCase() || '';
     const search = searchTerm.toLowerCase();
     
     return materialName.includes(search) || clientName.includes(search);
   });
 
   return (
     <div className="bg-card rounded-lg border h-full flex flex-col">
       {/* Header with search and filter */}
       <div className="p-4 border-b flex gap-3 items-center">
         <div className="relative flex-1">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Buscar solicitações..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="pl-9"
           />
         </div>
         <div className="flex items-center gap-2">
           <Filter className="h-4 w-4 text-muted-foreground" />
           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="w-[130px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {STATUS_OPTIONS.map((option) => (
                 <SelectItem key={option.value} value={option.value}>
                   {option.label}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
       </div>
 
       {/* Request List */}
       <ScrollArea className="flex-1">
         <div className="p-4 space-y-3">
           {isLoading ? (
             <div className="text-center text-muted-foreground py-8">
               Carregando solicitações...
             </div>
           ) : filteredRequests.length === 0 ? (
             <div className="text-center text-muted-foreground py-8">
               Nenhuma solicitação encontrada
             </div>
           ) : (
             filteredRequests.map((request) => (
               <div
                 key={request.id}
                 className="bg-background rounded-lg border p-4 hover:shadow-sm transition-shadow"
               >
                 <div className="flex items-start justify-between">
                   <div className="flex items-center gap-2">
                     <Package className="h-4 w-4 text-primary" />
                     <span className="font-medium">
                       {request.material_types?.name || 'Material não especificado'}
                     </span>
                   </div>
                   <Badge
                     variant={getStatusBadgeVariant(request.status)}
                     className={
                       request.status === 'entregue'
                         ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                         : request.status === 'enviada'
                         ? 'bg-amber-50 text-amber-700 border-amber-200'
                         : ''
                     }
                   >
                     {getStatusLabel(request.status)}
                   </Badge>
                 </div>
 
                 <div className="mt-2 text-sm text-muted-foreground">
                   {request.transport_type || 'Transporte não especificado'}
                 </div>
 
                 <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                   <Clock className="h-3 w-3" />
                   {request.created_at
                     ? format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                     : 'Data não disponível'}
                 </div>
               </div>
             ))
           )}
         </div>
       </ScrollArea>
     </div>
   );
 };