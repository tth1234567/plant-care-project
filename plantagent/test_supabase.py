from supabase import create_client, Client
import json


class PlantSenseDB:
    def __init__(self, url: str, key: str):
        self.supabase: Client = create_client(url, key)
        self.user_id = "ff943d22-ed57-4877-b18d-6622b1e223de"

    def get_user_full_data(self):
        """一次性查询该用户在四个表中的所有数据"""
        print(f"🔍 正在查询用户 [{self.user_id}] 的全量养护数据...\n")

        try:
            # 1. 查询所有植物 (Plants)
            plants_res = self.supabase.table("plants").select("*").eq("user_id", self.user_id).execute()
            plants = plants_res.data

            if not plants:
                print("未找到任何植物信息。")
                return

            # 获取该用户所有植物的 ID 列表，用于后续查询关联表
            plant_ids = [p['id'] for p in plants]

            # 2. 查询相关的诊断记录 (Diagnoses)
            # 使用 .in_ 过滤属于这些植物的诊断
            diag_res = self.supabase.table("diagnoses").select("*").in_("plant_id", plant_ids).execute()

            # 3. 查询关联的任务 (Tasks)
            tasks_res = self.supabase.table("tasks").select("*").eq("user_id", self.user_id).execute()

            # 4. 查询生长日志 (Growth Logs)
            logs_res = self.supabase.table("growth_logs").select("*").in_("plant_id", plant_ids).execute()

            # --- 汇总打印结果 ---
            self._print_report(plants, diag_res.data, tasks_res.data, logs_res.data)

        except Exception as e:
            print(f"❌ 查询出错: {e}")

    def _print_report(self, plants, diags, tasks, logs):
        """格式化输出报告"""
        print("=" * 60)
        print(f"🌱 植觉 PlantSense - 用户数据报告 (XingjianLee)")
        print("=" * 60)

        # 打印植物信息
        print(f"\n【1. 我的植物清单 ({len(plants)} 盆)】")
        for p in plants:
            water_gap = p['care_config'].get('water_interval_days', '未设置')
            print(f"- {p['nickname']} ({p['species_name']}) | 健康度: {p['health_level']}% | 浇水周期: {water_gap}天")

        # 打印诊断信息
        print(f"\n【2. 历史诊断记录 ({len(diags)} 条)】")
        for d in diags:
            # 找到对应的植物名称
            p_name = next((p['nickname'] for p in plants if p['id'] == d['plant_id']), "未知")
            print(f"- [{p_name}] 状态: {'已解决' if d['is_resolved'] else '治疗中'}")
            print(f"  AI建议: {d['ai_suggestion'][:50]}...")

        # 打印任务信息
        print(f"\n【3. 待办养护任务 ({len(tasks)} 条)】")
        for t in tasks:
            p_name = next((p['nickname'] for p in plants if p['id'] == t['plant_id']), "未知")
            time_str = t['adjusted_at'] if t['adjusted_at'] else t['scheduled_at']
            print(f"- [{t['task_type'].upper()}] {p_name} | 预定时间: {time_str}")
            if t['weather_context']:
                print(f"  状态说明: {t['weather_context']}")

        # 打印日志信息
        print(f"\n【4. 生长日志相册 ({len(logs)} 条)】")
        for l in logs:
            p_name = next((p['nickname'] for p in plants if p['id'] == l['plant_id']), "未知")
            mark = "⭐" if l['is_milestone'] else "📝"
            print(f"- {mark} [{p_name}] 笔记: {l['note']}")

        print("\n" + "=" * 60)


# --- 程序入口 ---
if __name__ == "__main__":
    # 替换成你自己的 URL 和 Key
    URL = "https://icbjumixbmdjcrthfgas.supabase.co"
    KEY = "sb_publishable_ibqaQMt0P_-TV-q8OHUT3Q_YXGacHDF"

    db = PlantSenseDB(URL, KEY)
    db.get_user_full_data()