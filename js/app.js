class OverwatchRecommendationSystem {
    constructor() {
        this.heroes = [];
        this.maps = [];
        this.currentMode = '5v5';
        this.selectedMap = null;
        this.selectedRole = 'all';
        this.currentSelectionContext = null; // 当前选择上下文 {team: 'team'|'enemy', role: 'tank'|'damage'|'support'}
        this.teamComposition = {
            tank: [],
            damage: [],
            support: []
        };
        this.enemyComposition = {
            tank: [],
            damage: [],
            support: []
        };
        this.maxSlots = {
            '5v5': { tank: 1, damage: 2, support: 2 },
            '6v6': { tank: 2, damage: 6, support: 6 } // 6v6模式更灵活
        };

        // 敌方阵容槽位配置（允许更多英雄用于测试）
        this.enemyMaxSlots = {
            '5v5': { tank: 1, damage: 2, support: 2 },
            '6v6': { tank: 2, damage: 6, support: 6 }
        };

        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.generateHeroSelectionAreas();
            this.setupEventListeners();
            this.updateUI();
            this.showEmptyRecommendations();
        } catch (error) {
            console.error('初始化失败:', error);
        }
    }

    async loadData() {
        try {
            const [heroesResponse, mapsResponse] = await Promise.all([
                fetch('data/heroes.json'),
                fetch('data/maps.json')
            ]);

            const heroesData = await heroesResponse.json();
            const mapsData = await mapsResponse.json();

            this.heroes = heroesData.heroes;
            this.maps = mapsData.maps;

            this.populateMapSelector();
        } catch (error) {
            console.error('数据加载失败:', error);
            // 使用备用数据或显示错误信息
            this.showError('数据加载失败，请刷新页面重试');
        }
    }

    populateMapSelector() {
        const mapSelector = document.getElementById('mapSelector');
        mapSelector.innerHTML = '<option value="">请选择地图</option>';

        this.maps.forEach(map => {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = `${map.name} (${this.getMapTypeLabel(map.type)})`;
            mapSelector.appendChild(option);
        });
    }

    getMapTypeLabel(type) {
        const labels = {
            'assault': '攻击',
            'Assault': '攻击',
            'escort': '护送',
            'Escort': '护送',
            'hybrid': '混合',
            'Hybrid': '混合',
            'flashpoint': '闪点',
            'Flashpoint': '闪点',
            'control': '控制',
            'Control': '控制',
            'push': '大白',
            'Push': '大白',
            'clash': '攻防阵线',
            'Clash': '攻防阵线',
        };
        return labels[type] || type;
    }

    generateHeroSelectionAreas() {
        this.generateTeamSelectionArea();
        this.generateEnemySelectionArea();
    }

    generateTeamSelectionArea() {
        const teamHeroList = document.getElementById('teamHeroList');
        teamHeroList.innerHTML = '';

        if (this.currentMode === '5v5') {
            // 5v5模式：按角色分组显示
            const maxSlots = this.maxSlots[this.currentMode];

            const tankGroup = this.createRoleGroup('tank', '坦克', maxSlots.tank, 'team');
            teamHeroList.appendChild(tankGroup);

            const damageGroup = this.createRoleGroup('damage', '输出', maxSlots.damage, 'team');
            teamHeroList.appendChild(damageGroup);

            const supportGroup = this.createRoleGroup('support', '支援', maxSlots.support, 'team');
            teamHeroList.appendChild(supportGroup);
        } else {
            // 6v6模式：显示6个通用待选框
            const teamGroup = this.createUniversalTeamGroup();
            teamHeroList.appendChild(teamGroup);
        }
    }

    generateEnemySelectionArea() {
        const enemyHeroList = document.getElementById('enemyHeroList');
        enemyHeroList.innerHTML = '';

        if (this.currentMode === '5v5') {
            // 5v5模式：按角色分组显示，使用与己方相同的槽位配置
            const maxSlots = this.maxSlots[this.currentMode];

            const tankGroup = this.createRoleGroup('tank', '坦克', maxSlots.tank, 'enemy');
            enemyHeroList.appendChild(tankGroup);

            const damageGroup = this.createRoleGroup('damage', '输出', maxSlots.damage, 'enemy');
            enemyHeroList.appendChild(damageGroup);

            const supportGroup = this.createRoleGroup('support', '支援', maxSlots.support, 'enemy');
            enemyHeroList.appendChild(supportGroup);
        } else {
            // 6v6模式：显示通用待选框
            const enemyGroup = this.createUniversalEnemyGroup();
            enemyHeroList.appendChild(enemyGroup);
        }
    }

    createRoleGroup(role, roleName, maxSlots, team) {
        const roleGroup = document.createElement('div');
        roleGroup.className = 'role-group';

        const header = document.createElement('h4');
        if (team === 'team') {
            header.innerHTML = `${roleName} <span class="role-count" id="${role}Count">0/${maxSlots}</span>`;
        } else {
            header.innerHTML = `${roleName} <span class="role-count" id="enemy${this.capitalizeFirst(role)}Count">0/${maxSlots}</span>`;
        }
        roleGroup.appendChild(header);

        const heroSlots = document.createElement('div');
        heroSlots.className = 'hero-slots vertical';
        heroSlots.id = team === 'team' ? `team${this.capitalizeFirst(role)}` : `enemy${this.capitalizeFirst(role)}`;

        // 根据游戏模式创建对应数量的待选框
        for (let i = 0; i < maxSlots; i++) {
            const slotContainer = document.createElement('div');
            slotContainer.className = 'hero-slot-container';

            const addBtn = document.createElement('button');
            addBtn.className = 'add-hero-btn';
            addBtn.dataset.team = team;
            addBtn.dataset.role = role;
            addBtn.dataset.slotIndex = i;
            addBtn.textContent = `+ 添加${roleName}`;

            slotContainer.appendChild(addBtn);
            heroSlots.appendChild(slotContainer);
        }

        roleGroup.appendChild(heroSlots);
        return roleGroup;
    }

    createUniversalTeamGroup() {
        const teamGroup = document.createElement('div');
        teamGroup.className = 'universal-team-group';

        const header = document.createElement('h4');
        header.innerHTML = `队伍阵容 <span class="team-stats" id="teamStats">0/5</span>`;
        teamGroup.appendChild(header);

        const heroSlots = document.createElement('div');
        heroSlots.className = 'hero-slots vertical';
        heroSlots.id = 'teamUniversal';

        // 首先创建推荐位置（用户位置）
        const recommendSlotContainer = document.createElement('div');
        recommendSlotContainer.className = 'hero-slot-container recommend-slot';
        recommendSlotContainer.id = 'recommendSlot';

        const recommendBtn = document.createElement('button');
        recommendBtn.className = 'recommend-slot-btn';
        recommendBtn.textContent = '👤 你的位置';
        recommendBtn.title = '为你保留的专属位置，选择角色后自动推荐';

        recommendSlotContainer.appendChild(recommendBtn);
        heroSlots.appendChild(recommendSlotContainer);

        // 然后创建5个可选择位置
        for (let i = 0; i < 5; i++) {
            const slotContainer = document.createElement('div');
            slotContainer.className = 'hero-slot-container';

            const addBtn = document.createElement('button');
            addBtn.className = 'add-hero-btn';
            addBtn.dataset.team = 'team';
            addBtn.dataset.role = 'universal';
            addBtn.dataset.slotIndex = i;
            addBtn.textContent = '+ 选择英雄';

            slotContainer.appendChild(addBtn);
            heroSlots.appendChild(slotContainer);
        }

        teamGroup.appendChild(heroSlots);
        return teamGroup;
    }

    createUniversalEnemyGroup() {
        const enemyGroup = document.createElement('div');
        enemyGroup.className = 'universal-enemy-group';

        const header = document.createElement('h4');
        header.innerHTML = `敌方阵容 <span class="enemy-stats" id="enemyStats">0/6</span>`;
        enemyGroup.appendChild(header);

        const heroSlots = document.createElement('div');
        heroSlots.className = 'hero-slots vertical';
        heroSlots.id = 'enemyUniversal';

        // 创建6个通用位置（敌方不限制数量）
        for (let i = 0; i < 6; i++) {
            const slotContainer = document.createElement('div');
            slotContainer.className = 'hero-slot-container';

            const addBtn = document.createElement('button');
            addBtn.className = 'add-hero-btn';
            addBtn.dataset.team = 'enemy';
            addBtn.dataset.role = 'universal';
            addBtn.dataset.slotIndex = i;
            addBtn.textContent = '+ 选择英雄';

            slotContainer.appendChild(addBtn);
            heroSlots.appendChild(slotContainer);
        }

        enemyGroup.appendChild(heroSlots);
        return enemyGroup;
    }

    setupEventListeners() {
        // 游戏模式切换
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });

        // 位置选择
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectRole(e.target.dataset.role);
            });
        });

        // 地图选择
        document.getElementById('mapSelector').addEventListener('change', (e) => {
            this.selectMap(e.target.value);
        });

        // 获取推荐按钮
        document.getElementById('getRecommendation').addEventListener('click', () => {
            this.calculateRecommendations();
        });

        // 添加英雄按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-hero-btn')) {
                const team = e.target.dataset.team;
                const role = e.target.dataset.role;
                this.openHeroSelectionModal(team, role);
            }
        });

        // 移除英雄按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                const heroSlot = e.target.closest('.hero-slot');
                const heroId = heroSlot.dataset.heroId;
                const compositionPanel = heroSlot.closest('.composition-panel');
                const isTeam = compositionPanel && compositionPanel.classList.contains('team-panel');
                this.removeHero(heroId, isTeam);
            }
        });

        // 英雄选择弹窗事件
        this.setupHeroSelectionModal();

        // 英雄详情模态框关闭
        document.querySelector('#heroModal .close').addEventListener('click', () => {
            document.getElementById('heroModal').style.display = 'none';
        });

        // 点击模态框外部关闭
        document.getElementById('heroModal').addEventListener('click', (e) => {
            if (e.target.id === 'heroModal') {
                document.getElementById('heroModal').style.display = 'none';
            }
        });
    }

    setupHeroSelectionModal() {
        const modal = document.getElementById('heroSelectionModal');
        const closeBtn = document.getElementById('closeHeroSelection');
        const filterBtns = document.querySelectorAll('.filter-btn');
        const heroGrid = document.getElementById('heroSelectionGrid');

        // 关闭按钮
        closeBtn.addEventListener('click', () => {
            this.closeHeroSelectionModal();
        });

        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'heroSelectionModal') {
                this.closeHeroSelectionModal();
            }
        });

        // ESC键关闭弹窗
        this.heroSelectionKeyHandler = (e) => {
            if ((e.key === 'Escape' || e.keyCode === 27) && modal.style.display === 'block') {
                this.closeHeroSelectionModal();
            }
        };
        document.addEventListener('keydown', this.heroSelectionKeyHandler);

        // 过滤按钮
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterHeroSelection(e.target.dataset.filter);
            });
        });

        // 英雄选择
        heroGrid.addEventListener('click', (e) => {
            const heroCard = e.target.closest('.hero-card');
            if (heroCard && !heroCard.classList.contains('disabled')) {
                this.selectHeroFromModal(heroCard.dataset.heroId);
            }
        });
    }

    selectRole(role) {
        this.selectedRole = role;

        // 更新按钮状态
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.role === role);
        });

        // 6v6模式下的角色选择逻辑
        if (this.currentMode === '6v6') {
            // 如果选择了特定角色（非"全部"），为用户占用该位置
            if (role !== 'all') {
                this.reserveRoleForUser(role);
            }

            // 总是触发推荐计算
            this.autoRecommendSixthHero();
        }
    }

    reserveRoleForUser(role) {
        // 只在6v6模式下执行
        if (this.currentMode !== '6v6') return;

        const composition = this.teamComposition;

        // 检查该角色是否已满
        let needToMakeSpace = false;

        if (role === 'tank') {
            // 坦克最多2个
            if (composition.tank.length >= 2) {
                // 移除最后一个坦克为用户让位
                composition.tank.pop();
                needToMakeSpace = true;
            }
        } else if (role === 'damage' || role === 'support') {
            // 检查总人数是否已达到5个
            const totalHeroes = Object.values(composition).reduce((sum, arr) => sum + arr.length, 0);
            if (totalHeroes >= 5) {
                // 优先从同角色中移除，如果同角色没有，则从其他角色移除
                if (composition[role].length > 0) {
                    composition[role].pop();
                } else {
                    // 从其他角色中移除最后一个英雄
                    if (composition.damage.length > 0) {
                        composition.damage.pop();
                    } else if (composition.support.length > 0) {
                        composition.support.pop();
                    } else if (composition.tank.length > 0) {
                        composition.tank.pop();
                    }
                }
                needToMakeSpace = true;
            }
        }

        // 如果为用户腾出了位置，更新UI
        if (needToMakeSpace) {
            this.updateUI();
        }
    }

    openHeroSelectionModal(team, role) {
        this.currentSelectionContext = { team, role };

        const modal = document.getElementById('heroSelectionModal');
        const title = document.getElementById('modalTitle');

        const teamLabel = team === 'team' ? '己方' : '敌方';

        if (role === 'universal') {
            title.textContent = `选择${teamLabel}英雄`;
        } else {
            const roleLabel = this.getRoleLabel(role);
            title.textContent = `选择${teamLabel}${roleLabel}英雄`;
        }

        this.renderHeroSelectionGrid();
        modal.style.display = 'block';
    }

    closeHeroSelectionModal() {
        document.getElementById('heroSelectionModal').style.display = 'none';
        this.currentSelectionContext = null;
    }

    renderHeroSelectionGrid(filter = 'all') {
        const heroGrid = document.getElementById('heroSelectionGrid');
        heroGrid.innerHTML = '';

        let filteredHeroes = this.heroes;
        if (filter !== 'all') {
            filteredHeroes = this.heroes.filter(hero => hero.role === filter);
        }

        filteredHeroes.forEach(hero => {
            const heroCard = this.createModalHeroCard(hero);
            heroGrid.appendChild(heroCard);
        });
    }

    createModalHeroCard(hero) {
        const div = document.createElement('div');
        div.className = 'hero-card';
        div.dataset.heroId = hero.id;
        div.dataset.role = hero.role;

        // 检查是否可以选择该英雄 - 只检查当前选择的队伍
        const canSelect = this.canSelectHero(hero);

        // 检查当前选择的队伍是否已有该英雄
        let alreadySelected = false;
        if (this.currentSelectionContext) {
            const { team } = this.currentSelectionContext;
            const composition = team === 'team' ? this.teamComposition : this.enemyComposition;
            alreadySelected = this.isHeroInComposition(hero.id, composition);
        }

        if (alreadySelected || !canSelect) {
            div.classList.add('disabled');
        }

        div.innerHTML = `
            <img src="${hero.avatar}" alt="${hero.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;50&quot; height=&quot;50&quot;><rect width=&quot;50&quot; height=&quot;50&quot; fill=&quot;%23ddd&quot;/><text x=&quot;25&quot; y=&quot;30&quot; text-anchor=&quot;middle&quot; fill=&quot;%23666&quot; font-size=&quot;10&quot;>${hero.name}</text></svg>'">
            <div class="hero-name" style="white-space: nowrap; overflow: visible; text-overflow: clip; font-size: 12px; line-height: 1.2; padding: 2px 4px; text-align: center; word-break: keep-all;">${hero.name}</div>
        `;

        return div;
    }

    canSelectHero(hero) {
        if (!this.currentSelectionContext) return false;

        const { team, role } = this.currentSelectionContext;
        const isTeam = team === 'team';
        const composition = isTeam ? this.teamComposition : this.enemyComposition;

        // 6v6模式下的通用选择逻辑
        if (this.currentMode === '6v6' && role === 'universal') {
            if (isTeam) {
                // 己方限制：坦克最多2个，总人数最多6个
                if (hero.role === 'tank' && composition.tank.length >= 2) {
                    return false;
                }

                const totalHeroes = Object.values(composition).reduce((sum, arr) => sum + arr.length, 0);
                if (totalHeroes >= 6) {
                    return false;
                }
            } else {
                // 敌方限制：总人数最多6个
                const totalHeroes = Object.values(composition).reduce((sum, arr) => sum + arr.length, 0);
                if (totalHeroes >= 6) {
                    return false;
                }
            }

            return true;
        }

        // 5v5模式下的角色限制逻辑
        if (this.currentMode === '5v5') {
            // 检查角色是否匹配
            if (hero.role !== role) return false;

            // 根据己方/敌方使用不同的槽位限制
            let maxSlots;
            if (isTeam) {
                maxSlots = this.maxSlots[this.currentMode];
            } else {
                maxSlots = { tank: 3, damage: 4, support: 3 }; // 敌方允许更多英雄
            }

            // 检查是否已达到角色上限
            if (composition[role].length >= maxSlots[role]) {
                return false;
            }
        }

        return true;
    }

    selectHeroFromModal(heroId) {
        if (!this.currentSelectionContext) return;

        const { team, role } = this.currentSelectionContext;
        const isTeam = team === 'team';

        if (this.addHeroToSlot(heroId, isTeam, role)) {
            this.closeHeroSelectionModal();
        }
    }

    filterHeroSelection(filter) {
        // 更新过滤按钮状态
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.renderHeroSelectionGrid(filter);
    }

    switchMode(mode) {
        this.currentMode = mode;

        // 更新按钮状态
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // 清空阵容（模式切换时重置）
        this.clearCompositions();

        // 重新生成英雄选择区域
        this.generateHeroSelectionAreas();

        this.updateUI();
        this.showEmptyRecommendations();

        // 清空推荐位置（如果存在）
        this.clearRecommendSlot();
    }

    selectMap(mapId) {
        this.selectedMap = mapId ? this.maps.find(m => m.id === mapId) : null;
    }

    selectHero(heroId) {
        const hero = this.heroes.find(h => h.id === heroId);
        if (!hero) return;

        // 显示英雄详情模态框（可选功能）
        this.showHeroDetails(hero);
    }

    addHeroToSlot(heroId, isTeam, role) {
        const hero = this.heroes.find(h => h.id === heroId);
        if (!hero) return false;

        const composition = isTeam ? this.teamComposition : this.enemyComposition;

        // 6v6模式下的通用添加逻辑
        if (this.currentMode === '6v6' && role === 'universal') {
            if (isTeam) {
                // 己方限制：坦克最多2个，总人数最多6个
                if (hero.role === 'tank' && composition.tank.length >= 2) {
                    return false;
                }

                const totalHeroes = Object.values(composition).reduce((sum, arr) => sum + arr.length, 0);
                if (totalHeroes >= 6) {
                    return false;
                }
            } else {
                // 敌方限制：总人数最多6个
                const totalHeroes = Object.values(composition).reduce((sum, arr) => sum + arr.length, 0);
                if (totalHeroes >= 6) {
                    return false;
                }
            }

            // 检查英雄是否已在阵容中
            if (composition[hero.role].find(h => h.id === heroId)) {
                return false;
            }

            composition[hero.role].push(hero);
            this.updateUI();

            // 如果是己方6v6模式，触发推荐更新
            if (isTeam && this.currentMode === '6v6') {
                this.autoRecommendSixthHero();
            }

            return true;
        }

        // 5v5模式下的角色限制逻辑
        if (this.currentMode === '5v5') {
            // 根据己方/敌方使用不同的槽位限制
            let maxSlots;
            if (isTeam) {
                maxSlots = this.maxSlots[this.currentMode];
            } else {
                maxSlots = { tank: 3, damage: 4, support: 3 }; // 敌方允许更多英雄
            }

            // 检查是否已达到角色上限
            if (composition[role].length >= maxSlots[role]) {
                return false;
            }

            // 检查英雄是否已在阵容中
            if (composition[role].find(h => h.id === heroId)) {
                return false;
            }

            composition[role].push(hero);
            this.updateUI();
            return true;
        }

        return false;
    }

    removeHero(heroId, isTeam) {
        const composition = isTeam ? this.teamComposition : this.enemyComposition;

        Object.keys(composition).forEach(role => {
            composition[role] = composition[role].filter(hero => hero.id !== heroId);
        });

        this.updateUI();

        // 如果是己方英雄被移除，且在6v6模式下，触发推荐更新
        if (isTeam && this.currentMode === '6v6') {
            this.autoRecommendSixthHero();
        }
    }

    clearCompositions() {
        this.teamComposition = { tank: [], damage: [], support: [] };
        this.enemyComposition = { tank: [], damage: [], support: [] };
    }

    renderHeroGrid() {
        const heroGrid = document.getElementById('heroGrid');
        heroGrid.innerHTML = '';

        this.heroes.forEach(hero => {
            const heroCard = this.createHeroCard(hero);
            heroGrid.appendChild(heroCard);
        });
    }

    createHeroCard(hero) {
        const div = document.createElement('div');
        div.className = 'hero-card';
        div.dataset.heroId = hero.id;
        div.dataset.role = hero.role;

        // 创建拖拽功能
        div.draggable = true;
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', hero.id);
        });

        // 双击添加到队伍
        div.addEventListener('dblclick', () => {
            this.addHeroToSlot(hero.id, true, hero.role);
        });

        // 右键添加到敌方
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.addHeroToSlot(hero.id, false, hero.role);
        });

        div.innerHTML = `
            <img src="${hero.avatar}" alt="${hero.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;60&quot; height=&quot;60&quot;><rect width=&quot;60&quot; height=&quot;60&quot; fill=&quot;%23ddd&quot;/><text x=&quot;30&quot; y=&quot;35&quot; text-anchor=&quot;middle&quot; fill=&quot;%23666&quot; font-size=&quot;12&quot;>${hero.name}</text></svg>'">
            <div class="hero-name">${hero.name}</div>
        `;

        return div;
    }

    updateUI() {
        this.updateRoleCounts();
        this.updateHeroSlots();
        this.updateHeroGridState();
    }

    updateRoleCounts() {
        // 只在5v5模式下更新角色计数，6v6模式由通用槽位方法处理
        if (this.currentMode === '5v5') {
            const maxSlots = this.maxSlots[this.currentMode];

            // 更新己方计数
            const tankCountEl = document.getElementById('tankCount');
            const damageCountEl = document.getElementById('damageCount');
            const supportCountEl = document.getElementById('supportCount');

            if (tankCountEl) {
                tankCountEl.textContent = `${this.teamComposition.tank.length}/${maxSlots.tank}`;
            }
            if (damageCountEl) {
                damageCountEl.textContent = `${this.teamComposition.damage.length}/${maxSlots.damage}`;
            }
            if (supportCountEl) {
                supportCountEl.textContent = `${this.teamComposition.support.length}/${maxSlots.support}`;
            }

            // 更新敌方计数
            const enemyTankCountEl = document.getElementById('enemyTankCount');
            const enemyDamageCountEl = document.getElementById('enemyDamageCount');
            const enemySupportCountEl = document.getElementById('enemySupportCount');

            if (enemyTankCountEl) {
                enemyTankCountEl.textContent = `${this.enemyComposition.tank.length}/${maxSlots.tank}`;
            }
            if (enemyDamageCountEl) {
                enemyDamageCountEl.textContent = `${this.enemyComposition.damage.length}/${maxSlots.damage}`;
            }
            if (enemySupportCountEl) {
                enemySupportCountEl.textContent = `${this.enemyComposition.support.length}/${maxSlots.support}`;
            }
        }
    }

    updateHeroSlots() {
        if (this.currentMode === '6v6') {
            // 6v6模式：更新通用英雄槽位
            this.renderUniversalTeamSlots();
            this.renderUniversalEnemySlots();
        } else {
            // 5v5模式：更新分组英雄槽位
            this.renderHeroSlots('team', this.teamComposition);
            this.renderHeroSlots('enemy', this.enemyComposition);
        }
    }

    renderHeroSlots(prefix, composition) {
        Object.keys(composition).forEach(role => {
            let containerId;
            if (role === 'tank') {
                containerId = `${prefix}Tank`;
            } else if (role === 'damage') {
                containerId = `${prefix}Damage`;
            } else if (role === 'support') {
                containerId = `${prefix}Support`;
            }

            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`Container not found: ${containerId}`);
                return;
            }
            console.log(`Found container: ${containerId}`);

            // 清除现有的英雄槽位，但保留添加按钮
            const slotContainers = container.querySelectorAll('.hero-slot-container');
            slotContainers.forEach(slotContainer => {
                const existingSlot = slotContainer.querySelector('.hero-slot');
                if (existingSlot) {
                    existingSlot.remove();
                }

                // 确保显示添加按钮
                const addBtn = slotContainer.querySelector('.add-hero-btn');
                if (addBtn) {
                    addBtn.style.display = 'block';
                }
            });

            // 添加英雄到对应的槽位
            composition[role].forEach((hero, index) => {
                const slotContainer = slotContainers[index];
                if (slotContainer) {
                    const addBtn = slotContainer.querySelector('.add-hero-btn');
                    if (addBtn) {
                        addBtn.style.display = 'none';
                    }

                    const slot = this.createHeroSlot(hero, prefix === 'team');
                    slotContainer.appendChild(slot);
                }
            });

            // 添加拖拽区域
            this.setupDropZone(container, prefix === 'team', role);
        });
    }

    renderUniversalTeamSlots() {
        const container = document.getElementById('teamUniversal');
        if (!container) return;

        // 获取所有已选择的英雄（按选择顺序）
        const allSelectedHeroes = [].concat(
            this.teamComposition.tank,
            this.teamComposition.damage,
            this.teamComposition.support
        );

        const slotContainers = container.querySelectorAll('.hero-slot-container:not(#recommendSlot)');
        const recommendSlot = document.getElementById('recommendSlot');

        // 清除现有的英雄槽位，但保留添加按钮
        slotContainers.forEach(slotContainer => {
            const existingSlot = slotContainer.querySelector('.hero-slot');
            if (existingSlot) {
                existingSlot.remove();
            }

            // 确保显示添加按钮
            const addBtn = slotContainer.querySelector('.add-hero-btn');
            if (addBtn) {
                addBtn.style.display = 'block';
            }
        });

        // 添加英雄到对应的槽位
        allSelectedHeroes.forEach((hero, index) => {
            const slotContainer = slotContainers[index];
            if (slotContainer) {
                const addBtn = slotContainer.querySelector('.add-hero-btn');
                if (addBtn) {
                    addBtn.style.display = 'none';
                }

                const slot = this.createHeroSlot(hero, true);
                slotContainer.appendChild(slot);
            }
        });

        // 处理推荐位置
        if (recommendSlot) {
            // 清除推荐位置的现有内容
            const existingSlot = recommendSlot.querySelector('.hero-slot');
            if (existingSlot) {
                existingSlot.remove();
            }

            // 确保显示推荐按钮
            const recommendBtn = recommendSlot.querySelector('.recommend-slot-btn');
            if (recommendBtn) {
                recommendBtn.style.display = 'block';
            }
        }

        // 更新队伍统计
        const teamStats = document.getElementById('teamStats');
        if (teamStats) {
            teamStats.textContent = `${allSelectedHeroes.length}/5`;
        }
    }

    renderUniversalEnemySlots() {
        const container = document.getElementById('enemyUniversal');
        if (!container) return;

        // 获取所有已选择的敌方英雄（按选择顺序）
        const allSelectedHeroes = [].concat(
            this.enemyComposition.tank,
            this.enemyComposition.damage,
            this.enemyComposition.support
        );

        const slotContainers = container.querySelectorAll('.hero-slot-container');

        // 清除现有的英雄槽位，但保留添加按钮
        slotContainers.forEach(slotContainer => {
            const existingSlot = slotContainer.querySelector('.hero-slot');
            if (existingSlot) {
                existingSlot.remove();
            }

            // 确保显示添加按钮
            const addBtn = slotContainer.querySelector('.add-hero-btn');
            if (addBtn) {
                addBtn.style.display = 'block';
            }
        });

        // 添加英雄到对应的槽位
        allSelectedHeroes.forEach((hero, index) => {
            const slotContainer = slotContainers[index];
            if (slotContainer) {
                const addBtn = slotContainer.querySelector('.add-hero-btn');
                if (addBtn) {
                    addBtn.style.display = 'none';
                }

                const slot = this.createHeroSlot(hero, false);
                slotContainer.appendChild(slot);
            }
        });

        // 更新敌方统计
        const enemyStats = document.getElementById('enemyStats');
        if (enemyStats) {
            enemyStats.textContent = `${allSelectedHeroes.length}/6`;
        }
    }

    createHeroSlot(hero, isTeam) {
        const div = document.createElement('div');
        div.className = 'hero-slot';
        div.dataset.heroId = hero.id;

        div.innerHTML = `
            <img src="${hero.avatar}" alt="${hero.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;35&quot; height=&quot;35&quot;><rect width=&quot;35&quot; height=&quot;35&quot; fill=&quot;%23ddd&quot;/><text x=&quot;17&quot; y=&quot;22&quot; text-anchor=&quot;middle&quot; fill=&quot;%23666&quot; font-size=&quot;8&quot;>${hero.name}</text></svg>'">
            <div class="hero-info">
                <div class="hero-name">${hero.name}</div>
            </div>
            <button class="remove-btn">×</button>
        `;

        return div;
    }

    setupDropZone(container, isTeam, role) {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.classList.add('can-drop');
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('can-drop');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('can-drop');

            const heroId = e.dataTransfer.getData('text/plain');
            this.addHeroToSlot(heroId, isTeam, role);
        });
    }

    updateHeroGridState() {
        const heroCards = document.querySelectorAll('.hero-card');

        heroCards.forEach(card => {
            const heroId = card.dataset.heroId;
            const role = card.dataset.role;

            // 检查英雄是否已被选择
            const inTeam = this.isHeroInComposition(heroId, this.teamComposition);
            const inEnemy = this.isHeroInComposition(heroId, this.enemyComposition);

            // 添加视觉标识区分己方和敌方选择
            card.classList.toggle('in-team', inTeam);
            card.classList.toggle('in-enemy', inEnemy);
            card.classList.toggle('selected', inTeam || inEnemy);

            // 检查是否可以添加更多该角色的英雄到己方
            const maxSlots = this.maxSlots[this.currentMode];
            const canAddToTeam = this.currentMode === '5v5' ?
                this.teamComposition[role].length < maxSlots[role] :
                this.canAddHeroIn6v6(role);

            // 只有己方阵容已满或该英雄已在己方时才禁用（允许选择敌方已有的英雄）
            card.classList.toggle('disabled', !canAddToTeam);
        });
    }

    isHeroInComposition(heroId, composition) {
        return Object.values(composition).some(roleHeroes =>
            roleHeroes.some(hero => hero.id === heroId)
        );
    }

    canAddHeroIn6v6(role) {
        if (role === 'tank' && this.teamComposition.tank.length >= 2) {
            return false;
        }

        const totalHeroes = Object.values(this.teamComposition).reduce((sum, arr) => sum + arr.length, 0);
        return totalHeroes < 6;
    }

    canRecommendHero(hero) {
        if (this.currentMode === '5v5') {
            // 5v5模式：检查角色上限
            const maxSlots = this.maxSlots[this.currentMode];
            return this.teamComposition[hero.role].length < maxSlots[hero.role];
        } else {
            // 6v6模式：考虑阵容限制规则
            const totalHeroes = Object.values(this.teamComposition).reduce((sum, arr) => sum + arr.length, 0);

            // 检查总人数限制：如果已有6个英雄，不能再推荐
            if (totalHeroes >= 6) {
                return false;
            }

            // 检查坦克限制：如果已有2个坦克，不能再推荐坦克
            if (hero.role === 'tank' && this.teamComposition.tank.length >= 2) {
                return false;
            }

            // 如果总人数为5（队友已满），检查用户角色选择
            if (totalHeroes === 5) {
                // 如果用户选择了特定角色，只推荐该角色的英雄
                if (this.selectedRole !== 'all') {
                    return hero.role === this.selectedRole;
                }
                // 如果用户选择"全部"，可以推荐任何符合坦克限制的英雄
                return true;
            }

            // 总人数小于5时，正常推荐
            return true;
        }
    }

    calculateRecommendations() {
        let availableHeroes = this.heroes.filter(hero => {
            // 基础过滤：英雄不在己方阵容中（允许推荐敌方已有的英雄）
            const notInTeamComposition = !this.isHeroInComposition(hero.id, this.teamComposition);

            // 角色限制检查
            if (!notInTeamComposition) return false;

            return this.canRecommendHero(hero);
        });

        // 根据选择的角色进行过滤
        if (this.selectedRole !== 'all') {
            availableHeroes = availableHeroes.filter(hero => hero.role === this.selectedRole);
        }

        // 如果没有可推荐的英雄，显示提示
        if (availableHeroes.length === 0) {
            this.showNoAvailableHeroes();
            return;
        }

        const recommendations = availableHeroes.map(hero => {
            const score = this.calculateHeroScore(hero);
            return {
                hero,
                score,
                details: this.getScoreDetails(hero)
            };
        }).sort((a, b) => b.score - a.score);

        this.displayRecommendations(recommendations.slice(0, 10)); // 显示前10个推荐
    }

    calculateHeroScore(hero) {
        let score = 100; // 初始分数

        // 1. 地图适配性（优先级最高）
        const mapScore = this.getMapScore(hero);
        score += mapScore;

        // 2. 敌方英雄克制（其次）
        const counterScore = this.getCounterScore(hero);
        score += counterScore;

        // 3. 己方英雄配合（最后）
        const synergyScore = this.getSynergyScore(hero);
        score += synergyScore;

        // return Math.max(0, score); // 确保分数不为负
        return score;
    }

    getMapScore(hero) {
        if (!this.selectedMap || !this.selectedMap.suitableHeroes) {
            return 0;
        }

        const mapBonus = this.selectedMap.suitableHeroes[hero.id] || 0;
        return mapBonus;
    }

    getCounterScore(hero) {
        let score = 0;
        const enemyHeroes = [].concat(
            this.enemyComposition.tank,
            this.enemyComposition.damage,
            this.enemyComposition.support
        );

        enemyHeroes.forEach(enemy => {
            // 如果该英雄克制敌方英雄，加分
            if (hero.counters.includes(enemy.id)) {
                score += 8;
            }
            // 如果该英雄被敌方英雄克制，减分
            if (hero.counteredBy.includes(enemy.id)) {
                score -= 15;
            }
        });

        return score;
    }

    getSynergyScore(hero) {
        let score = 0;
        const teamHeroes = [].concat(
            this.teamComposition.tank,
            this.teamComposition.damage,
            this.teamComposition.support
        );

        teamHeroes.forEach(teammate => {
            // 如果该英雄与队友有良好配合，加分
            if (hero.synergyWith.includes(teammate.id)) {
                score += 5;
            }
        });

        return score;
    }

    getScoreDetails(hero) {
        const mapScore = this.getMapScore(hero);
        const counterScore = this.getCounterScore(hero);
        const synergyScore = this.getSynergyScore(hero);

        return {
            map: mapScore,
            counter: counterScore,
            synergy: synergyScore
        };
    }

    displayRecommendations(recommendations) {
        const container = document.getElementById('recommendations');
        container.innerHTML = '';

        if (recommendations.length === 0) {
            this.showEmptyRecommendations();
            return;
        }

        // 如果是6v6模式，将最佳推荐显示在推荐位置
        if (this.currentMode === '6v6' && recommendations.length > 0) {
            this.displayTopRecommendationInSlot(recommendations[0]);
        }

        recommendations.forEach(rec => {
            const item = this.createRecommendationItem(rec);
            container.appendChild(item);
        });
    }

    displayTopRecommendationInSlot(recommendation) {
        const recommendSlot = document.getElementById('recommendSlot');
        if (!recommendSlot) return;

        const { hero, score } = recommendation;

        // 隐藏推荐按钮
        const recommendBtn = recommendSlot.querySelector('.recommend-slot-btn');
        if (recommendBtn) {
            recommendBtn.style.display = 'none';
        }

        // 清除现有的英雄槽位
        const existingSlot = recommendSlot.querySelector('.hero-slot');
        if (existingSlot) {
            existingSlot.remove();
        }

        // 创建推荐英雄槽位
        const recommendHeroSlot = this.createRecommendHeroSlot(hero, score);
        recommendSlot.appendChild(recommendHeroSlot);
    }

    createRecommendHeroSlot(hero, score) {
        const div = document.createElement('div');
        div.className = 'hero-slot recommend-hero-slot';
        div.dataset.heroId = hero.id;

        const scoreClass = this.getScoreClass(score);
        div.classList.add(scoreClass);

        div.innerHTML = `
            <img src="${hero.avatar}" alt="${hero.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;35&quot; height=&quot;35&quot;><rect width=&quot;35&quot; height=&quot;35&quot; fill=&quot;%23ddd&quot;/><text x=&quot;17&quot; y=&quot;22&quot; text-anchor=&quot;middle&quot; fill=&quot;%23666&quot; font-size=&quot;8&quot;>${hero.name}</text></svg>'">
            <div class="hero-info">
                <div class="hero-name">${hero.name}</div>
                <div class="hero-score">推荐: ${Math.round(score)}</div>
            </div>
            <button class="add-recommend-btn" title="点击添加为第6位英雄">+</button>
        `;

        // 点击推荐英雄添加到阵容
        div.addEventListener('click', () => {
            const success = this.addHeroToSlot(hero.id, true, hero.role);
            if (success) {
                // 成功添加后，恢复推荐按钮
                this.clearRecommendSlot();
            } else {
                // 添加失败时显示提示
                this.showRecommendationTip(hero.name);
            }
        });

        return div;
    }

    clearRecommendSlot() {
        const recommendSlot = document.getElementById('recommendSlot');
        if (!recommendSlot) return;

        // 清除推荐英雄槽位
        const existingSlot = recommendSlot.querySelector('.hero-slot');
        if (existingSlot) {
            existingSlot.remove();
        }

        // 显示推荐按钮
        const recommendBtn = recommendSlot.querySelector('.recommend-slot-btn');
        if (recommendBtn) {
            recommendBtn.style.display = 'block';
        }
    }

    autoRecommendSixthHero() {
        // 只在6v6模式下自动推荐
        if (this.currentMode !== '6v6') return;

        // 检查阵容是否达到5个英雄，如果没有，清空推荐位置
        const totalHeroes = Object.values(this.teamComposition).reduce((sum, arr) => sum + arr.length, 0);
        if (totalHeroes < 5) {
            this.clearRecommendSlot();
            return;
        }

        // 获取可推荐的英雄
        let availableHeroes = this.heroes.filter(hero => {
            // 基础过滤：英雄不在己方阵容中（允许推荐敌方已有的英雄）
            const notInTeamComposition = !this.isHeroInComposition(hero.id, this.teamComposition);

            // 角色限制检查
            if (!notInTeamComposition) return false;

            return this.canRecommendHero(hero);
        });

        // 根据选择的角色进行过滤
        if (this.selectedRole !== 'all') {
            availableHeroes = availableHeroes.filter(hero => hero.role === this.selectedRole);
        }

        // 如果有可推荐的英雄，计算并显示最佳推荐
        if (availableHeroes.length > 0) {
            const recommendations = availableHeroes.map(hero => {
                const score = this.calculateHeroScore(hero);
                return {
                    hero,
                    score,
                    details: this.getScoreDetails(hero)
                };
            }).sort((a, b) => b.score - a.score);

            // 在推荐位置显示最佳推荐
            if (recommendations.length > 0) {
                this.displayTopRecommendationInSlot(recommendations[0]);
            }
        } else {
            // 没有可推荐的英雄时，清空推荐位置显示推荐按钮
            this.clearRecommendSlot();
        }
    }

    createRecommendationItem(recommendation) {
        const { hero, score, details } = recommendation;

        const div = document.createElement('div');
        div.className = `recommendation-item ${this.getScoreClass(score)}`;

        div.innerHTML = `
            <div class="recommendation-hero">
                <img src="${hero.avatar}" alt="${hero.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;50&quot; height=&quot;50&quot;><rect width=&quot;50&quot; height=&quot;50&quot; fill=&quot;%23ddd&quot;/><text x=&quot;25&quot; y=&quot;30&quot; text-anchor=&quot;middle&quot; fill=&quot;%23666&quot; font-size=&quot;10&quot;>${hero.name}</text></svg>'">
            </div>
            <div class="recommendation-info">
                <div class="recommendation-name">${hero.name}</div>
                <div class="recommendation-role">${this.getRoleLabel(hero.role)}</div>
                <div class="recommendation-details">
                    <span>地图: +${details.map}</span>
                    <span>克制: ${details.counter >= 0 ? '+' : ''}${details.counter}</span>
                    <span>配合: +${details.synergy}</span>
                </div>
            </div>
            <div class="recommendation-score">${Math.round(score)}</div>
        `;

        // 点击推荐项添加英雄
        div.addEventListener('click', () => {
            const success = this.addHeroToSlot(hero.id, true, hero.role);

            // 如果添加失败（比如阵容已满），提供用户友好的提示
            if (!success && this.currentMode === '6v6') {
                const totalHeroes = Object.values(this.teamComposition).reduce((sum, arr) => sum + arr.length, 0);
                if (totalHeroes >= 6) {
                    this.showRecommendationTip(hero.name);
                }
            }
        });

        return div;
    }

    getScoreClass(score) {
        if (score >= 120) return 'high-score';
        if (score >= 100) return 'medium-score';
        return 'low-score';
    }

    getRoleLabel(role) {
        const labels = {
            'tank': '坦克',
            'damage': '输出',
            'support': '支援'
        };
        return labels[role] || role;
    }

    showEmptyRecommendations() {
        const container = document.getElementById('recommendations');
        container.innerHTML = `
            <div class="empty-state">
                <p>请配置阵容，然后点击"获取英雄推荐"按钮</p>
                <p style="font-size: 0.9rem; margin-top: 8px;">💡 可选择地图获得更精准的推荐</p>
            </div>
        `;
    }

    showNoAvailableHeroes() {
        const container = document.getElementById('recommendations');

        let message = '';
        let subMessage = '';

        if (this.selectedRole !== 'all') {
            const roleLabel = this.getRoleLabel(this.selectedRole);

            if (this.currentMode === '6v6') {
                const totalHeroes = Object.values(this.teamComposition).reduce((sum, arr) => sum + arr.length, 0);

                if (this.selectedRole === 'tank' && this.teamComposition.tank.length >= 2) {
                    message = `${roleLabel}位置已满`;
                    subMessage = '己方阵容已有2个坦克，无法添加更多坦克';
                } else if (totalHeroes >= 6) {
                    message = `${roleLabel}无法添加`;
                    subMessage = '己方阵容已满（6/6），请移除其他英雄';
                } else {
                    message = `暂无可推荐的${roleLabel}英雄`;
                    subMessage = '所有可用的英雄都已被选择';
                }
            } else {
                // 5v5模式
                const maxSlots = this.maxSlots[this.currentMode];
                const currentCount = this.teamComposition[this.selectedRole].length;

                if (currentCount >= maxSlots[this.selectedRole]) {
                    message = `${roleLabel}位置已满`;
                    subMessage = `${roleLabel}位置已达上限（${currentCount}/${maxSlots[this.selectedRole]}）`;
                } else {
                    message = `暂无可推荐的${roleLabel}英雄`;
                    subMessage = '所有可用的英雄都已被选择';
                }
            }
        } else {
            // 选择全部位置
            const totalHeroes = Object.values(this.teamComposition).reduce((sum, arr) => sum + arr.length, 0);

            if (this.currentMode === '6v6' && totalHeroes >= 6) {
                message = '阵容已满';
                subMessage = '己方阵容已满（6/6），请移除一些英雄';
            } else {
                message = '暂无可推荐的英雄';
                subMessage = '所有可用的英雄都已被选择或受阵容限制';
            }
        }

        container.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
                <p style="font-size: 0.9rem; margin-top: 8px;">${subMessage}</p>
            </div>
        `;
    }

    showHeroDetails(hero) {
        const modal = document.getElementById('heroModal');
        const details = document.getElementById('heroDetails');

        details.innerHTML = `
            <h2>${hero.name}</h2>
            <div style="display: flex; gap: 20px; margin: 20px 0;">
                <img src="${hero.avatar}" alt="${hero.name}" style="width: 100px; height: 100px; border-radius: 10px;" onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;100&quot; height=&quot;100&quot;><rect width=&quot;100&quot; height=&quot;100&quot; fill=&quot;%23ddd&quot;/><text x=&quot;50&quot; y=&quot;55&quot; text-anchor=&quot;middle&quot; fill=&quot;%23666&quot; font-size=&quot;14&quot;>${hero.name}</text></svg>'">
                <div>
                    <p><strong>角色:</strong> ${this.getRoleLabel(hero.role)}</p>
                    <p><strong>克制:</strong> ${hero.counters.map(id => this.getHeroName(id)).join(', ') || '无'}</p>
                    <p><strong>被克制:</strong> ${hero.counteredBy.map(id => this.getHeroName(id)).join(', ') || '无'}</p>
                    <p><strong>配合良好:</strong> ${hero.synergyWith.map(id => this.getHeroName(id)).join(', ') || '无'}</p>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="app.addHeroToSlot('${hero.id}', true, '${hero.role}')" style="margin: 0 10px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">添加到队伍</button>
                <button onclick="app.addHeroToSlot('${hero.id}', false, '${hero.role}')" style="margin: 0 10px; padding: 10px 20px; background: #e53e3e; color: white; border: none; border-radius: 8px; cursor: pointer;">添加到敌方</button>
            </div>
        `;

        modal.style.display = 'block';
    }

    getHeroName(heroId) {
        const hero = this.heroes.find(h => h.id === heroId);
        return hero ? hero.name : heroId;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showRecommendationTip(heroName) {
        // 创建临时提示消息
        const tipDiv = document.createElement('div');
        tipDiv.className = 'recommendation-tip';
        tipDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #667eea;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-size: 0.9rem;
            text-align: center;
        `;
        tipDiv.innerHTML = `
            <p><strong>${heroName}</strong> 是一个很好的选择！</p>
            <p>阵容已满，考虑替换现有英雄</p>
        `;

        document.body.appendChild(tipDiv);

        // 3秒后自动移除提示
        setTimeout(() => {
            if (tipDiv && tipDiv.parentNode) {
                tipDiv.parentNode.removeChild(tipDiv);
            }
        }, 3000);
    }

    showError(message) {
        const container = document.getElementById('recommendations');
        container.innerHTML = `
            <div class="empty-state" style="color: #e53e3e;">
                <p>${message}</p>
            </div>
        `;
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new OverwatchRecommendationSystem();
});

// 导出到全局作用域以便在HTML中使用
window.app = app;