 import { FileText } from 'lucide-react';
 import DashboardLayout from '@/components/DashboardLayout';
 import { RequestForm } from '@/components/solicitacoes/RequestForm';
 import { RequestList } from '@/components/solicitacoes/RequestList';
 
 const Solicitacoes = () => {
   return (
     <DashboardLayout 
       title="Solicitações" 
       subtitle="Gerencie as solicitações de coleta"
       icon={<FileText className="h-5 w-5" />}
     >
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
         {/* Left side - Form */}
         <div className="overflow-auto">
           <RequestForm />
         </div>
 
         {/* Right side - Request List */}
         <div className="h-full">
           <RequestList />
         </div>
       </div>
     </DashboardLayout>
   );
 };
 
 export default Solicitacoes;
