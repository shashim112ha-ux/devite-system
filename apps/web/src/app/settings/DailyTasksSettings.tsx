"use client";

import { useState } from "react";
import { trpc } from "../../utils/trpc";
import { Plus, Trash2, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function DailyTasksSettings() {
  const { data: tasks, refetch } = trpc.getTaskTemplates.useQuery();
  const createTaskMutation = trpc.createTaskTemplate.useMutation();
  const toggleTaskMutation = trpc.toggleTaskTemplateActive.useMutation();
  const deleteTaskMutation = trpc.deleteTaskTemplate.useMutation();

  const [title, setTitle] = useState("");
  const [role, setRole] = useState("KITCHEN");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createTaskMutation.mutateAsync({ title, role, description });
      setTitle("");
      setDescription("");
      refetch();
    } catch (e: any) {
      alert(`خطأ: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-brand-gold">المهام اليومية (إدارة النماذج)</h2>
      </div>

      <div className="bg-brand-navy-light p-6 rounded-[30px] border border-white/5 space-y-4">
        <h3 className="font-bold text-lg mb-4">إضافة مهمة جديدة</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="text-sm text-gray-400 block mb-2">عنوان المهمة</label>
            <input 
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="مثال: تنظيف آلة القهوة"
              className="w-full bg-brand-black p-4 rounded-xl border border-white/5"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-2">الدور الوظيفي</label>
            <select 
              value={role} onChange={e => setRole(e.target.value)}
              className="w-full bg-brand-black p-4 rounded-xl border border-white/5"
            >
              <option value="KITCHEN">المطبخ (KITCHEN)</option>
              <option value="CASHIER">الكاشير (CASHIER)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleCreate}
              disabled={createTaskMutation.isLoading}
              className="w-full bg-brand-orange py-4 rounded-xl font-bold flex justify-center items-center gap-2"
            >
              <Plus size={18} /> إضافة
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-2">وصف إضافي (اختياري)</label>
          <input 
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="تفاصيل المهمة..."
            className="w-full bg-brand-black p-4 rounded-xl border border-white/5"
          />
        </div>
      </div>

      <div className="bg-brand-navy-light p-6 rounded-[30px] border border-white/5">
        <h3 className="font-bold text-lg mb-4">المهام الحالية</h3>
        {tasks?.length === 0 ? (
          <p className="text-gray-500 text-sm">لا توجد مهام يومية مضافة.</p>
        ) : (
          <div className="space-y-3">
            {tasks?.map(task => (
              <motion.div key={task.id} className="flex justify-between items-center p-4 bg-brand-black rounded-xl border border-white/5">
                <div>
                  <div className="flex gap-3 items-center">
                    <h4 className="font-bold">{task.title}</h4>
                    <span className="text-[10px] bg-brand-orange/20 text-brand-orange px-2 py-1 rounded font-bold">
                      {task.role}
                    </span>
                  </div>
                  {task.description && <p className="text-xs text-gray-400 mt-1">{task.description}</p>}
                </div>
                <div className="flex gap-3 items-center">
                  <button 
                    onClick={async () => {
                      await toggleTaskMutation.mutateAsync({ id: task.id, isActive: !task.isActive });
                      refetch();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${task.isActive ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}
                  >
                    {task.isActive ? 'مفعل' : 'معطل'}
                  </button>
                  <button 
                    onClick={async () => {
                      if(confirm("هل أنت متأكد من حذف هذه المهمة؟")) {
                        await deleteTaskMutation.mutateAsync({ id: task.id });
                        refetch();
                      }
                    }}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
