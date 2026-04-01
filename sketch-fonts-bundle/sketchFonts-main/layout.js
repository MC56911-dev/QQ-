// 布局管理器
class LayoutManager {
    constructor() {
        this.fontSize = 200;
        this.lineSpacing = 1.2;
        this.letterSpacing = 1.0;
        this.alignment = 'center';
        this.offsetX = 0; // 新增X偏移
        this.offsetY = 0; // 新增Y偏移
        this.textLines = ['HELLO', 'WORLD'];
        this.letterConfigs = [];
    }
    
    // 解析文本为行和字母
    parseText(text) {
        this.textLines = text.split('\n').filter(line => line.trim().length > 0);
        return this.textLines;
    }
    
    // 计算所有字母的位置
    calculateLayout(canvasWidth, canvasHeight, seed, useRandomFonts, availableFonts) {
        this.letterConfigs = [];
        randomSeed(seed);
        
        if (this.textLines.length === 0) return;
        
        let totalHeight = this.textLines.length * this.fontSize * this.lineSpacing;
        let startY = (canvasHeight - totalHeight) / 2 + this.fontSize / 2;
        
        for (let lineIndex = 0; lineIndex < this.textLines.length; lineIndex++) {
            let line = this.textLines[lineIndex];
            let lineY = startY + lineIndex * this.fontSize * this.lineSpacing;
            
            // 计算行宽度
            let lineWidth = line.length * this.fontSize * 0.6 * this.letterSpacing;
            let startX;
            
            switch (this.alignment) {
                case 'left':
                    startX = 50 + this.fontSize / 2;
                    break;
                case 'right':
                    startX = canvasWidth - lineWidth - 50 + this.fontSize / 2;
                    break;
                default: // center
                    startX = (canvasWidth - lineWidth) / 2 + this.fontSize / 2;
                    break;
            }
            
            // 为每个字母创建配置
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                let char = line[charIndex];
                if (char.trim() === '') continue; // 跳过空格
                
                let letterX = startX + charIndex * this.fontSize * 0.6 * this.letterSpacing;
                
                let config = {
                    letter: char.toUpperCase(),
                    x: letterX + this.offsetX, // 应用X偏移
                    y: lineY + this.offsetY,   // 应用Y偏移
                    font: null,
                    fontName: 'FlorDeRuina-Flor',
                    lineIndex: lineIndex,
                    charIndex: charIndex
                };
                
                if (availableFonts.length > 0) {
                    config.font = availableFonts[0];
                    config.fontName = 'FlorDeRuina-Flor';
                }
                
                this.letterConfigs.push(config);
            }
        }
        
        return this.letterConfigs;
    }
    
    // 获取布局信息
    getLayoutInfo() {
        const alignZh = { left: '左 / Left', right: '右 / Right', center: '中 / Center' };
        const alignLabel = alignZh[this.alignment] || this.alignment;
        let info = `行数 / Lines: ${this.textLines.length} | 字号 / Size: ${this.fontSize} | 行距 / Line: ${this.lineSpacing} | 字距 / Track: ${this.letterSpacing} | 对齐 / Align: ${alignLabel} | X 偏移 / X: ${this.offsetX} | Y 偏移 / Y: ${this.offsetY}<br>`;
        info += '字母 / Glyphs: ';
        
        let displayConfigs = this.letterConfigs.slice(0, 10);
        for (let i = 0; i < displayConfigs.length; i++) {
            let config = displayConfigs[i];
            info += `${config.letter}(${config.fontName})`;
            if (i < displayConfigs.length - 1) info += ' | ';
        }
        
        if (this.letterConfigs.length > 10) {
            info += ` … 共 ${this.letterConfigs.length} 个 / ${this.letterConfigs.length} total`;
        }
        
        return info;
    }
    
    // 更新设置
    updateSettings(fontSize, lineSpacing, letterSpacing, alignment) {
        this.fontSize = fontSize;
        this.lineSpacing = lineSpacing;
        this.letterSpacing = letterSpacing;
        this.alignment = alignment;
    }
    
    // 更新偏移设置
    updateOffsets(offsetX, offsetY) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }
}

// 全局布局管理器实例
let layoutManager = new LayoutManager();