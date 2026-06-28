"use client";

import { trpc } from "../utils/trpc";
import { CheckSquare, Circle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function DailyTasksPage() {
  const tasksQuery = trpc.getMyDailyTasks.useQuery();
  const toggleMutation = trpc.toggleDailyTaskCompletion.useMutation();

  const handleToggle = async (taskTemplateId: string, currentCompleted: boolean) => {
    try {
      await toggleMutation.mutateAsync({
        taskTemplateId,
        isCompleted: !currentCompleted
      });
      tasksQuery.refetch();
    } catch (error: any) {
      alert("خطأ: " + error.message);
    }
  };

  if (tasksQuery.isLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
        <p className="text-brand-gold font-bold">جاري تحميل المهام...</p>
      </div>
    );
  }

  const tasks = tasksQuery.data || [];

  return (
    <div className="min-h-screen bg-brand-black p-10">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-brand-gold flex items-center gap-3">
          <CheckSquare size={36} /> مهامي اليومية
        </h1>
        <p className="text-gray-400 mt-2">المهام المطلوبة منك إنجازها لليوم الحالي.</p>
      </header>

      <div className="max-w-3xl">
        {tasks.length === 0 ? (
          <div className="bg-brand-navy-light border border-white/5 p-10 rounded-[30px] text-center">
            <CheckSquare size={48} className="mx-auto text-gray-500 mb-4 opacity-50" />
            <p className="text-gray-400 font-bold text-lg">لا توجد مهام يومية مسندة إليك اليوم.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((t, i) => {
              const isCompleted = t.completion?.isCompleted || false;
              return (
                <motion.div 
                  key={t.template.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-brand-navy-light rounded-[30px] p-6 flex items-start gap-4 border transition-all ${
                    isCompleted ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 hover:border-brand-orange/30'
                  }`}
                >
                  <button 
                    onClick={() => handleToggle(t.template.id, isCompleted)}
                    disabled={toggleMutation.isLoading}
                    className="mt-1"
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={32} className="text-green-500" />
                    ) : (
                      <Circle size={32} className="text-gray-500 hover:text-brand-orange transition-colors" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className={`text-xl font-bold ${isCompleted ? 'text-green-500 line-through opacity-70' : 'text-white'}`}>
                      {t.template.title}
                    </h3>
                    {t.template.description && (
                      <p className={`mt-2 ${isCompleted ? 'text-gray-500 opacity-70' : 'text-gray-400'}`}>
                        {t.template.description}
                      </p>
                    )}
                    {isCompleted && t.completion?.completedAt && (
                      <p className="text-xs text-green-500/50 mt-4">
                        تم الإنجاز: {new Date(t.completion.completedAt).toLocaleTimeString('ar-SA')}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
