// client/src/components/dialogs/admin/VisualizarPersonalModal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCircle, Mail, ShieldCheck, CalendarDays, Link2, Users, BarChartHorizontalBig, Info } from 'lucide-react';
// ***** CAMINHO DO IMPORT CORRIGIDO *****
import { PersonalDetalhes } from '@shared/types/personal'; 

interface VisualizarPersonalModalProps {
  isOpen: boolean;
  onClose: () => void;
  personal: PersonalDetalhes | null;
  isLoading?: boolean;
}

const formatDate = (dateString?: Date | string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        const parts = String(dateString).split('/');
        if (parts.length === 3) {
            // Tenta DD/MM/YYYY
            const parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate.toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                });
            }
        }
        return 'Data inválida'; // Retorna se não conseguir parsear
    }
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch (e) {
    return String(dateString); // Fallback para a string original em caso de erro inesperado
  }
};

const InfoItem: React.FC<{ label: string; value?: string | number | React.ReactNode; isMonospace?: boolean; icon?: React.ReactNode }> = ({ label, value, isMonospace, icon }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between py-2.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center min-w-[160px] sm:min-w-fit mb-1 sm:mb-0">
      {icon && <span className="mr-2 shrink-0">{icon}</span>}
      {label}:
    </dt>
    <dd className={`text-sm text-gray-900 dark:text-gray-100 sm:text-right ${isMonospace ? 'font-mono text-xs break-all' : 'break-words'}`}>
      {value ?? <span className="text-gray-400 dark:text-gray-500 italic">Não informado</span>}
    </dd>
  </div>
);

export default function VisualizarPersonalModal({ isOpen, onClose, personal, isLoading }: VisualizarPersonalModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <UserCircle className="mr-3 h-7 w-7 text-primary" />
            Detalhes do Personal Trainer
          </DialogTitle>
          {personal && !isLoading && (
            <DialogDescription>
              Informações detalhadas sobre {personal.nome}.
            </DialogDescription>
          )}
        </DialogHeader>
        
        {isLoading && (
          <div className="py-12 flex flex-col justify-center items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="mt-3 text-gray-600 dark:text-gray-400">Carregando detalhes...</span>
          </div>
        )}

        {!isLoading && personal && (
          <div className="py-4 space-y-1 max-h-[65vh] overflow-y-auto pr-3 -mr-3 custom-scrollbar">
            <InfoItem label="Nome Completo" value={personal.nome} icon={<UserCircle className="h-4 w-4 text-gray-500 dark:text-gray-400"/>} />
            <InfoItem label="Email" value={personal.email} icon={<Mail className="h-4 w-4 text-gray-500 dark:text-gray-400"/>} />
            <InfoItem 
              label="Função (Role)" 
              icon={<ShieldCheck className="h-4 w-4 text-gray-500 dark:text-gray-400"/>}
              value={
                <Badge variant={personal.role === 'Admin' ? 'destructive' : 'default'}
                       className={`font-medium ${personal.role === 'Admin' ? 
                                  'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 border-red-300 dark:border-red-700' : 
                                  'bg-blue-100 text-blue-700 dark:bg-sky-900/60 dark:text-sky-300 border-blue-300 dark:border-sky-700'}`}>
                  {personal.role === 'Admin' && <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                  {personal.role}
                </Badge>
              }
            />
            <InfoItem label="Data de Cadastro" value={formatDate(personal.createdAt)} icon={<CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400"/>} />
            <InfoItem label="Última Atualização" value={formatDate(personal.updatedAt)} icon={<CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400"/>} />
            
            <h3 className="text-md font-semibold pt-4 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 mt-4">Assinatura</h3>
            <InfoItem 
              label="Status" 
              icon={<Info className="h-4 w-4 text-gray-500 dark:text-gray-400"/>}
              value={
                 <Badge variant={personal.statusAssinatura === 'ativa' ? 'success' : 'secondary'}
                        className={personal.statusAssinatura === 'ativa' ? 
                                   'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300 border-green-300 dark:border-green-700' :
                                   'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300 border-gray-300 dark:border-gray-600'}>
                    {personal.statusAssinatura || 'Não definida'}
                 </Badge>
              }
            />
            <InfoItem label="Plano ID" value={personal.planoId} icon={<BarChartHorizontalBig className="h-4 w-4 text-gray-500 dark:text-gray-400"/>} />
            <InfoItem label="Limite de Alunos" value={personal.limiteAlunos} icon={<Users className="h-4 w-4 text-gray-500 dark:text-gray-400"/>} />
            <InfoItem label="Fim da Assinatura" value={formatDate(personal.dataFimAssinatura)} icon={<CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400"/>} />
            
            {personal.tokenCadastroAluno && (
              <>
                <h3 className="text-md font-semibold pt-4 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 mt-4">Link de Cadastro de Alunos</h3>
                <InfoItem label="Token" value={personal.tokenCadastroAluno} isMonospace icon={<Link2 className="h-4 w-4 text-gray-500 dark:text-gray-400"/>} />
              </>
            )}
          </div>
        )}

        {!isLoading && !personal && isOpen && (
             <div className="py-8 text-center text-gray-500 dark:text-gray-400">Não foi possível carregar os dados do personal.</div>
        )}

        <DialogFooter className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
