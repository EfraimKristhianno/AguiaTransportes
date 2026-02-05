 import { useState } from 'react';
 import { Truck as TruckIcon, CheckCircle, Clock, Search } from 'lucide-react';
 import DashboardLayout from '@/components/DashboardLayout';
 import { Card, CardContent } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { Avatar, AvatarFallback } from '@/components/ui/avatar';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Skeleton } from '@/components/ui/skeleton';
 import { useDrivers } from '@/hooks/useDrivers';
 
 const Motoristas = () => {
   const [searchTerm, setSearchTerm] = useState('');
   const { data: drivers, isLoading } = useDrivers();
 
   const filteredDrivers = drivers?.filter(driver =>
     driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     driver.phone?.toLowerCase().includes(searchTerm.toLowerCase())
   ) || [];
 
   const totalDrivers = drivers?.length || 0;
   const totalCompleted = drivers?.reduce((acc, d) => acc + d.completed_deliveries, 0) || 0;
   const totalActive = drivers?.reduce((acc, d) => acc + d.active_deliveries, 0) || 0;
 
   const getStatusBadge = (status: string) => {
     const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
       available: { label: 'Disponível', variant: 'outline' },
       busy: { label: 'Em rota', variant: 'default' },
       offline: { label: 'Offline', variant: 'secondary' },
     };
     const config = statusConfig[status] || statusConfig.offline;
     return <Badge variant={config.variant}>{config.label}</Badge>;
   };
 
   const getInitials = (name: string) => {
     return name
       .split(' ')
       .map(n => n[0])
       .join('')
       .toUpperCase()
       .slice(0, 2);
   };
 
   return (
     <DashboardLayout 
       title="Gestão de Motoristas" 
       subtitle="Acompanhe o desempenho e as corridas dos motoristas"
       icon={<TruckIcon className="h-5 w-5" />}
     >
       <div className="space-y-6">
         {/* Stats Cards */}
         <div className="grid gap-4 md:grid-cols-3">
           <Card>
             <CardContent className="flex items-center gap-4 p-6">
               <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                 <TruckIcon className="h-6 w-6 text-primary" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{isLoading ? '-' : totalDrivers}</p>
                 <p className="text-sm text-muted-foreground">Motoristas</p>
               </div>
             </CardContent>
           </Card>
 
           <Card>
             <CardContent className="flex items-center gap-4 p-6">
               <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                 <CheckCircle className="h-6 w-6 text-green-500" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{isLoading ? '-' : totalCompleted}</p>
                 <p className="text-sm text-muted-foreground">Entregas Concluídas</p>
               </div>
             </CardContent>
           </Card>
 
           <Card>
             <CardContent className="flex items-center gap-4 p-6">
               <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                 <Clock className="h-6 w-6 text-yellow-500" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{isLoading ? '-' : totalActive}</p>
                 <p className="text-sm text-muted-foreground">Corridas Ativas</p>
               </div>
             </CardContent>
           </Card>
         </div>
 
         {/* Search */}
         <Card>
           <CardContent className="p-4">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
               <Input
                 placeholder="Buscar por nome ou telefone..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10"
               />
             </div>
           </CardContent>
         </Card>
 
         {/* Drivers Table */}
         <Card>
           <CardContent className="p-0">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Motorista</TableHead>
                   <TableHead>Telefone</TableHead>
                   <TableHead className="text-center">Total</TableHead>
                   <TableHead className="text-center">Concluídas</TableHead>
                   <TableHead className="text-center">Ativas</TableHead>
                   <TableHead className="text-center">Status</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoading ? (
                   Array.from({ length: 3 }).map((_, i) => (
                     <TableRow key={i}>
                       <TableCell>
                         <div className="flex items-center gap-3">
                           <Skeleton className="h-10 w-10 rounded-full" />
                           <Skeleton className="h-4 w-32" />
                         </div>
                       </TableCell>
                       <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                       <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                       <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                       <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                       <TableCell><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                     </TableRow>
                   ))
                 ) : filteredDrivers.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center">
                       <p className="text-muted-foreground">
                         {searchTerm ? 'Nenhum motorista encontrado' : 'Nenhum motorista cadastrado'}
                       </p>
                     </TableCell>
                   </TableRow>
                 ) : (
                   filteredDrivers.map((driver) => (
                     <TableRow key={driver.id}>
                       <TableCell>
                         <div className="flex items-center gap-3">
                           <Avatar className="h-10 w-10 bg-pink-100">
                             <AvatarFallback className="bg-pink-100 text-pink-600 font-medium">
                               {getInitials(driver.name)}
                             </AvatarFallback>
                           </Avatar>
                           <span className="font-medium">{driver.name}</span>
                         </div>
                       </TableCell>
                       <TableCell>{driver.phone || '-'}</TableCell>
                       <TableCell className="text-center">{driver.total_deliveries}</TableCell>
                       <TableCell className="text-center text-green-600 font-medium">
                         {driver.completed_deliveries}
                       </TableCell>
                       <TableCell className="text-center text-yellow-600 font-medium">
                         {driver.active_deliveries}
                       </TableCell>
                       <TableCell className="text-center">
                         {getStatusBadge(driver.status)}
                       </TableCell>
                     </TableRow>
                   ))
                 )}
               </TableBody>
             </Table>
           </CardContent>
         </Card>
       </div>
     </DashboardLayout>
   );
 };
 
 export default Motoristas;
