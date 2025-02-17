let darkToggle = document.querySelector('#darkToggle');
let isDarkMode = localStorage.getItem('darkMode');

// Check if dark mode was previously enabled and set the initial state
if (isDarkMode === 'true') {
  document.body.classList.add('dark');
  document.querySelector('#lightModeImg').style.display = 'none';
  document.querySelector('#darkModeImg').style.display = 'inline';
}

darkToggle.addEventListener('click', () => {
  if (document.body.classList.contains('dark')) {
    document.body.classList.remove('dark');
    document.querySelector('#lightModeImg').style.display = 'inline';
    document.querySelector('#darkModeImg').style.display = 'none';
    localStorage.setItem('darkMode', 'false'); // Store the dark mode state
  } else {
    document.body.classList.add('dark');
    document.querySelector('#lightModeImg').style.display = 'none';
    document.querySelector('#darkModeImg').style.display = 'inline';
    localStorage.setItem('darkMode', 'true'); // Store the dark mode state
  }
});