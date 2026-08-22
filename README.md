# Karina's Corner

一个为 Karina 制作并部署在 GitHub Pages 的静态网站。

线上地址：[garrywang123.github.io/Karina](https://garrywang123.github.io/Karina/)

## 当前功能

- 首页：Hello Kitty 风格欢迎页、Karina 专属小狗熊与互动彩蛋。
- 特伦托交换中心：行程日历、航班/火车/酒店信息、时区对照与实时天气。
- 特伦托地图：Google 地图地点浏览、地点详情、搜索联想、路线查询、多种出行方式和全屏地图。
- 生活信息：为餐饮、住宿、交通、周末旅行等内容预留结构化模块。
- 小游戏室：`开局托儿所`。在 16×10 棋盘上框选数字，框内现存数字之和为 10 时消除；包含单局计分、学历成长路线、游戏次数及狗熊亲亲补充动画。
- 响应式界面：兼顾电脑与手机浏览。

## 项目结构

```text
.
├── index.html          # 网站首页
├── pages/              # 独立功能页面
├── scripts/            # JavaScript 交互逻辑
├── styles/             # 全站样式
├── assets/             # 图片素材
├── docs/               # 项目文档与版本记录
└── .github/workflows/  # GitHub Pages 自动发布流程
```

## 技术说明

这是一个无需后端服务器的静态网站，主要使用：

- **HTML**：页面结构
- **CSS**：视觉与响应式排版
- **JavaScript**：地图、天气、导航和游戏交互

它不是 Java 项目，也不是 Python 项目。浏览器原生运行 JavaScript，因此这种网站不需要安装 Python 运行环境。

## 更新记录

完整版本历史见 [docs/CHANGELOG.md](./docs/CHANGELOG.md)。
