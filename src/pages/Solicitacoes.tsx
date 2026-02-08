import { useState } from 'react';
import { FileText, Search, Filter } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { RequestForm } from '@/components/solicitacoes/RequestForm';
import { RequestList } from '@/components/solicitacoes/RequestList';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'solicitada', label: 'Solicitada' },
  { value: 'aceita', label: 'Aceita' },
  { value: 'coletada', label: 'Coletada' },
  { value: 'em_rota', label: 'Em Trânsito' },
  { value: 'entregue', label: 'Entregue' },
];

const Solicitacoes = () => {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  return <DashboardLayout title="Solicitações" subtitle={role === 'cliente' ? "Crie e acompanhe suas solicitações de coleta" : "Gerencie as solicitações de coleta"} icon={<FileText className="h-5 w-5" />}>
      <div className="flex flex-col gap-4 md:gap-6 mx-0">
        <RequestForm />
        
        {/* Search and filter bar */}
        <div className="bg-card rounded-lg border p-4 flex gap-3 items-center shadow-[var(--shadow-card)]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, cliente, material, NF ou O.P..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Request List */}
        <div className="h-[500px]">
          <RequestList searchTerm={searchTerm} statusFilter={statusFilter} />
        </div>
      </div>
    </DashboardLayout>;
};
export default Solicitacoes;