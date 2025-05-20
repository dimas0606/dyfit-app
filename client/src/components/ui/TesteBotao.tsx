import { Pencil, Trash2 } from "lucide-react";

export default function TesteBotao() {
  function handleEdit() {
    console.log("✅ Botão editar funcionando!");
    alert("Botão de Editar Funcionando!");
  }

  function handleDelete() {
    console.log("✅ Botão excluir funcionando!");
    alert("Botão de Excluir Funcionando!");
  }

  return (
    <div className="flex gap-4 p-8">
      <button
        onClick={handleEdit}
        className="flex items-center justify-center h-10 w-10 rounded-md bg-gray-100 hover:bg-gray-300 transition"
      >
        <Pencil className="h-5 w-5 text-black pointer-events-auto" />
      </button>

      <button
        onClick={handleDelete}
        className="flex items-center justify-center h-10 w-10 rounded-md bg-gray-100 hover:bg-gray-300 transition"
      >
        <Trash2 className="h-5 w-5 text-black pointer-events-auto" />
      </button>
    </div>
  );
}
