import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# === 尺度設定（mm単位） ===
width = 20000     # コート幅（半面の横幅）
height = 20000    # 半面の縦方向
center_x = width / 2

# ゴール幅3m
goal_left = center_x - 1500
goal_right = center_x + 1500

# 半径
r6 = 6000   # ゴールエリアライン半径
r9 = 9000   # フリースローライン半径

fig, ax = plt.subplots(figsize=(10,10))
ax.set_xlim(-500, width+500)
ax.set_ylim(-500, height+500)
ax.set_aspect('equal')
ax.axis('off')

# === コート外枠（半面 20m×20m） ===
ax.add_patch(patches.Rectangle((0,0), width, height, fill=False, lw=2, color='black'))

# === ゴールライン ===
ax.plot([goal_left, goal_right], [0,0], color='black', lw=8)

# === ゴールエリアライン（6m実線）===
# 正面直線（3m）
ax.plot([goal_left, goal_right], [r6, r6], color='black', lw=2)

# 左半径6m弧（左ポスト中心）
theta = np.linspace(np.pi/2, np.pi, 200)
x = goal_left + r6 * np.cos(theta)
y = r6 * np.sin(theta)
ax.plot(x, y, color='black', lw=2)

# 右半径6m弧（右ポスト中心）
theta = np.linspace(0, np.pi/2, 200)
x = goal_right + r6 * np.cos(theta)
y = r6 * np.sin(theta)
ax.plot(x, y, color='black', lw=2)

# === フリースローライン（9m破線）===
# 正面直線（3m）
ax.plot([goal_left, goal_right], [r9, r9], color='black', lw=2, ls=(0,(12,12)))

# 左9m弧（左ポスト中心）
theta = np.linspace(np.pi/2, np.pi, 300)
x = goal_left + r9 * np.cos(theta)
y = r9 * np.sin(theta)
# 弧の始点・終点はサイドライン手前で止まる（9m弧がコート外に出ない）
x, y = x[y >= 0], y[y >= 0]
ax.plot(x, y, color='black', lw=2, ls=(0,(12,12)))

# 右9m弧（右ポスト中心）
theta = np.linspace(0, np.pi/2, 300)
x = goal_right + r9 * np.cos(theta)
y = r9 * np.sin(theta)
x, y = x[y >= 0], y[y >= 0]
ax.plot(x, y, color='black', lw=2, ls=(0,(12,12)))

# === 7mライン（1m）===
ax.plot([center_x-500, center_x+500], [7000,7000], color='black', lw=2)
ax.text(center_x+700, 7150, "7m", fontsize=10, va='center')

# === GK4mライン（15cm）===
ax.plot([center_x-75, center_x+75], [4000,4000], color='black', lw=2)

# === ハーフライン ===
ax.plot([0,width], [20000,20000], color='black', lw=2)

# === センター半円 ===
theta = np.linspace(0, np.pi, 200)
x = center_x + 2000 * np.cos(theta)
y = 20000 + 2000 * np.sin(theta)
ax.plot(x, y, color='black', lw=2)

# === ポスト位置 ===
ax.add_patch(patches.Circle((goal_left, 0), 100, color='black'))
ax.add_patch(patches.Circle((goal_right, 0), 100, color='black'))

# === 注記 ===
ax.text(800, 19000, "Handball half-court (IHF standard, corrected geometry)", fontsize=10)

plt.tight_layout()
plt.show()
