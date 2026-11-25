# 门壹修主仓与网站子模块

主仓保存维修素材、抖音作品和制作工程，网站是独立的 Git 仓库。以下命令在主仓根目录执行。各文件的用途见[项目地图](docs/project-map.md)。

## 首次获取两个仓库

```bash
git clone --recurse-submodules git@github.com:lockingroad/men.git
cd men
```

如果已有主仓，运行 `git submodule update --init --recursive` 检出主仓记录的网站版本。

## 只提交主仓的改动

先运行 `git status --short`，把下面的示例路径换成本次要提交的文件。

```bash
git add -- content/INDEX.md
git diff --cached
git commit -m "更新作品索引"
git push
```

## 修改并提交网站

先在两个仓库用 `git status -sb`、`git -C website/zq-menyixiu-web status -sb` 核对分支。首次初始化子模块可能处于 detached HEAD。要改网站时，先在子仓切到对应的开发或发布分支。以下以其已有的 `main` 分支和 README 改动为例。

```bash
git -C website/zq-menyixiu-web switch main
git -C website/zq-menyixiu-web add -- README.md
git -C website/zq-menyixiu-web diff --cached
git -C website/zq-menyixiu-web commit -m "更新网站说明"
git -C website/zq-menyixiu-web push
```

确认子仓提交已推送，再提交主仓的子模块指针。若有本次配套素材，同时按路径暂存。

```bash
git add -- website/zq-menyixiu-web
git diff --cached --submodule=log
git commit -m "更新网站子模块版本"
git push
```

## 更新到主仓记录的网站版本

先保存两仓正在编辑的改动，再运行以下命令。最后一行显示检出的子仓提交。

```bash
git pull --ff-only
git submodule update --init --recursive
git submodule status
```
