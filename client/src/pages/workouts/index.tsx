// client/src/pages/workouts/index.tsx
import React from 'react';
import { Link } from 'wouter'; 
import { ArrowLeft } from 'lucide-react'; 

export default function WorkoutsIndex() {
  
  // --- CORRIGIR A EXTENSÃO DO ARQUIVO AQUI ---
  const imagePath = '/em-desenvolvimento.jpeg'; // Usar .jpeg
  // --- FIM DA CORREÇÃO ---

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 min-h-[calc(100vh-150px)]"> 
      
      <img 
        src={imagePath}                     
        alt="Ferramenta em desenvolvimento" 
        className="max-w-xs w-full h-auto mb-6" 
      />

           <p className="text-gray-500 mb-8">
        Esta seção de Treinos está sendo preparada. Volte em breve!
      </p>

      <Link 
        href="/" 
        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para o Painel
      </Link>

    </div>
  );
}