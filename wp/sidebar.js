document.addEventListener('DOMContentLoaded', function() {
    var sidebar = document.querySelector('.sidebar-push');
    var content = document.querySelector('body'); // Target the main content area
    var toggleButton = document.querySelector('.toggle-sidebar');

    // Function to handle sidebar state based on screen width
    function handleSidebarState() {
        if (window.innerWidth < 1025) {
            sidebar.classList.remove('open');
            content.classList.remove('content-pushed');
            content.classList.remove('content-partially-pushed');
        } else {
            sidebar.classList.add('open');
            content.classList.add('content-pushed');
        }
    }

    // Call the function on page load
    handleSidebarState();

    // Apply transition class after page load
    setTimeout(function() {
        sidebar.classList.add('sidebar-transition');
    }, 100);

    // Adjust the sidebar state on window resize
    window.addEventListener('resize', handleSidebarState);

    // Toggle sidebar open/close
    if (toggleButton) {
        toggleButton.addEventListener('click', function() {
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                content.classList.remove('content-pushed');
                content.classList.add('content-partially-pushed'); // Add margin for 80px visible sidebar
            } else {
                sidebar.classList.add('open');
                content.classList.remove('content-partially-pushed');
                if (window.innerWidth >= 1025) {
                    content.classList.add('content-pushed');
                }
            }
        });
    }
});