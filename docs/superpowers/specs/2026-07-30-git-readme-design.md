# Git README 设计

## 目标

在主仓库根目录新增 `README.md`，为日常使用者提供主项目与
`website/zq-menyixiu-web` submodule 的精简 Git 命令速查。

## 内容结构

README 只包含以下内容：

1. 首次克隆主项目并初始化 submodule。
2. 提交主项目中的普通文件。
3. 修改、提交并推送网站子项目，然后在主项目提交更新后的 submodule 指针。
4. 拉取主项目，并将 submodule 同步到主项目记录的版本。

## 编写原则

- 以可直接复制的命令为主，避免展开 Git 原理。
- 使用当前仓库的真实地址和 submodule 路径。
- 明确“先提交子项目，再提交主项目指针”的顺序。
- 使用指定文件路径进行暂存，不推荐可能误收无关文件的 `git add .`。
- 不修改网站子项目已有的 `README.md`。

## 验证

- 确认 README 位于主仓库根目录。
- 确认所有命令使用 `website/zq-menyixiu-web`。
- 确认克隆命令包含 `--recurse-submodules`。
- 确认同步命令包含 `git submodule update --init --recursive`。
