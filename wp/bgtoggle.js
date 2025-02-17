document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggleElements');
    toggleButton.addEventListener('click', function () {
        const content = document.getElementById('toggledElement');
        const currentDisplay = window.getComputedStyle(content).display;
        if (currentDisplay === 'none') {
            content.style.display = 'flex';
        } else {
            content.style.display = 'none';
        }
    });
});