document.addEventListener('DOMContentLoaded', function() {
    const gradientType = document.getElementById('gradient-type');
    const direction = document.getElementById('direction');
    const color1 = document.getElementById('color1');
    const color2 = document.getElementById('color2');
    const generateBtn = document.getElementById('generate-btn');
    const exportBtn = document.getElementById('export-btn');
    const preview = document.getElementById('gradient-preview');
    const cssCode = document.getElementById('css-code');

    function generateGradient() {
        const type = gradientType.value;
        const dir = direction.value;
        const c1 = color1.value;
        const c2 = color2.value;

        let css;
        if (type === 'linear') {
            css = `background: linear-gradient(${dir}, ${c1}, ${c2});`;
        } else {
            css = `background: radial-gradient(${c1}, ${c2});`;
        }

        // Update preview
        preview.style.cssText = css;

        // Update CSS code
        cssCode.value = css;
    }

    // Event listeners for live update
    gradientType.addEventListener('change', generateGradient);
    direction.addEventListener('change', generateGradient);
    color1.addEventListener('input', generateGradient);
    color2.addEventListener('input', generateGradient);

    // Generate button (though live update handles it)
    generateBtn.addEventListener('click', generateGradient);

    // Export functionality
    exportBtn.addEventListener('click', function() {
        const css = cssCode.value;
        const blob = new Blob([css], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gradient.css';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Initial generation
    generateGradient();
});