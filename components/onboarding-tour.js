// MangaMotion AI - Onboarding Tour Component

class OnboardingTour {
    constructor(steps, options = {}) {
        this.steps = steps;
        this.currentStep = 0;
        this.options = {
            onComplete: () => {},
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.start();
    }
    
    render() {
        const tourHTML = `
            <div class="onboarding-overlay" id="onboardingOverlay"></div>
            <div class="onboarding-tooltip" id="onboardingTooltip">
                <div class="tooltip-content">
                    <h4 id="tooltipTitle"></h4>
                    <p id="tooltipText"></p>
                </div>
                <div class="tooltip-footer">
                    <div class="tooltip-progress" id="tooltipProgress"></div>
                    <div class="tooltip-actions">
                        <button class="tooltip-btn skip-btn" id="skipBtn">Skip</button>
                        <button class="tooltip-btn next-btn" id="nextBtn">Next</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', tourHTML);
        
        this.overlay = document.getElementById('onboardingOverlay');
        this.tooltip = document.getElementById('onboardingTooltip');
        this.title = document.getElementById('tooltipTitle');
        this.text = document.getElementById('tooltipText');
        this.progress = document.getElementById('tooltipProgress');
        this.skipBtn = document.getElementById('skipBtn');
        this.nextBtn = document.getElementById('nextBtn');
    }
    
    bindEvents() {
        this.skipBtn.addEventListener('click', () => this.end());
        this.nextBtn.addEventListener('click', () => this.next());
        window.addEventListener('resize', () => this.positionTooltip());
    }
    
    start() {
        document.body.classList.add('onboarding-active');
        this.showStep(this.currentStep);
    }
    
    next() {
        this.currentStep++;
        if (this.currentStep < this.steps.length) {
            this.showStep(this.currentStep);
        } else {
            this.end();
        }
    }
    
    end() {
        document.body.classList.remove('onboarding-active');
        this.overlay.style.display = 'none';
        this.tooltip.style.display = 'none';
        
        this.steps.forEach(step => {
            const element = document.querySelector(step.element);
            if (element) {
                element.classList.remove('onboarding-highlight');
            }
        });
        
        if (this.options.onComplete) {
            this.options.onComplete();
        }
        
        // Clean up
        this.overlay.remove();
        this.tooltip.remove();
    }
    
    showStep(index) {
        const step = this.steps[index];
        
        // Remove highlight from previous step
        if (index > 0) {
            const prevStep = this.steps[index - 1];
            const prevElement = document.querySelector(prevStep.element);
            if (prevElement) {
                prevElement.classList.remove('onboarding-highlight');
            }
        }
        
        const element = document.querySelector(step.element);
        
        if (!element) {
            console.warn(`Onboarding element not found: ${step.element}`);
            this.next();
            return;
        }
        
        this.title.textContent = step.title;
        this.text.textContent = step.text;
        
        element.classList.add('onboarding-highlight');
        
        this.positionTooltip(element, step.position);
        this.updateProgress();
        
        if (index === this.steps.length - 1) {
            this.nextBtn.textContent = 'Finish';
        } else {
            this.nextBtn.textContent = 'Next';
        }
    }
    
    positionTooltip(element, position = 'bottom') {
        const rect = element.getBoundingClientRect();
        
        this.tooltip.style.display = 'block';
        
        let top, left;
        
        switch (position) {
            case 'top':
                top = rect.top - this.tooltip.offsetHeight - 10;
                left = rect.left + (rect.width / 2) - (this.tooltip.offsetWidth / 2);
                break;
            case 'right':
                top = rect.top + (rect.height / 2) - (this.tooltip.offsetHeight / 2);
                left = rect.right + 10;
                break;
            case 'left':
                top = rect.top + (rect.height / 2) - (this.tooltip.offsetHeight / 2);
                left = rect.left - this.tooltip.offsetWidth - 10;
                break;
            default: // bottom
                top = rect.bottom + 10;
                left = rect.left + (rect.width / 2) - (this.tooltip.offsetWidth / 2);
                break;
        }
        
        // Adjust if out of viewport
        if (top < 0) top = 10;
        if (left < 0) left = 10;
        if (left + this.tooltip.offsetWidth > window.innerWidth) {
            left = window.innerWidth - this.tooltip.offsetWidth - 10;
        }
        
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }
    
    updateProgress() {
        this.progress.innerHTML = '';
        for (let i = 0; i < this.steps.length; i++) {
            const dot = document.createElement('div');
            dot.classList.add('progress-dot');
            if (i === this.currentStep) {
                dot.classList.add('active');
            }
            this.progress.appendChild(dot);
        }
    }
}

// CSS for onboarding tour
const onboardingTourStyles = `
    <style>
        .onboarding-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 2000;
        }
        
        .onboarding-tooltip {
            position: fixed;
            background: #0B1220;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 20px;
            z-index: 2001;
            width: 320px;
            box-shadow: 0 8px 24px rgba(3, 6, 23, 0.6);
            transition: all 0.3s ease;
        }
        
        .tooltip-content h4 {
            font-size: 18px;
            font-weight: 600;
            color: #FF3366;
            margin: 0 0 8px 0;
        }
        
        .tooltip-content p {
            font-size: 14px;
            color: #94A3B8;
            margin: 0 0 16px 0;
            line-height: 1.5;
        }
        
        .tooltip-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .tooltip-progress {
            display: flex;
            gap: 6px;
        }
        
        .progress-dot {
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            transition: all 0.3s ease;
        }
        
        .progress-dot.active {
            background: #FF3366;
            transform: scale(1.2);
        }
        
        .tooltip-actions {
            display: flex;
            gap: 8px;
        }
        
        .tooltip-btn {
            background: none;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .skip-btn {
            color: #94A3B8;
        }
        
        .skip-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .next-btn {
            background: #FF3366;
            color: white;
        }
        
        .next-btn:hover {
            background: #ff1a53;
        }
        
        .onboarding-highlight {
            position: relative;
            z-index: 2001;
            box-shadow: 0 0 0 4px #FF3366;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        
        body.onboarding-active .onboarding-highlight {
            background: #0B1220;
        }
    </style>
`;

// Add styles to document head
if (!document.getElementById('onboarding-tour-styles')) {
    document.head.insertAdjacentHTML('beforeend', onboardingTourStyles);
}

window.OnboardingTour = OnboardingTour;
