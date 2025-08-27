document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('quote-form');
  if (!form) return;

  const formArea = document.getElementById('form-area');
  const successMessage = document.getElementById('success-message');
  const formSteps = Array.from(form.querySelectorAll('.form-step'));
  const stepIndicators = Array.from(document.querySelectorAll('.step-indicator .step'));
  const progressBar = document.getElementById('progress');
  const currentStepDisplay = document.getElementById('current-step-display');
  const newQuoteBtn = document.getElementById('new-quote-btn');
  let currentStep = 1;

  const updateUI = () => {
    formSteps.forEach((step, index) => {
      step.classList.toggle('active', index + 1 === currentStep);
    });
    if (progressBar) progressBar.style.width = `${((currentStep - 1) / (formSteps.length - 1)) * 100}%`;
    if (currentStepDisplay) currentStepDisplay.textContent = currentStep;
    stepIndicators.forEach((indicator, index) => {
      indicator.classList.remove('active', 'completed');
      if (index + 1 < currentStep) indicator.classList.add('completed');
      if (index + 1 === currentStep) indicator.classList.add('active');
    });
    if (currentStep === formSteps.length) updateReviewSection();
  };

  const validateStep = (stepIndex) => {
    let isValid = true;
    const step = formSteps[stepIndex - 1];
    step.querySelectorAll('[required]').forEach(input => {
      const errorMsg = document.getElementById(input.getAttribute('aria-describedby'));
      let inputValid = input.value.trim() !== '';
      if (input.type === 'email') {
        inputValid = /^\S+@\S+\.\S+$/.test(input.value);
      }
      if (!inputValid) {
        isValid = false;
        input.classList.add('invalid');
        if (errorMsg) errorMsg.style.display = 'block';
      } else {
        input.classList.remove('invalid');
        if (errorMsg) errorMsg.style.display = 'none';
      }
    });
    return isValid;
  };

  const updateReviewSection = () => {
    document.getElementById('review-property-summary').textContent = `${form.bedrooms.value} Bed, ${form.bathrooms.value} Bath ${form['property-type'].value}`;
    const servicesList = document.getElementById('review-services');
    servicesList.innerHTML = '<li>Standard Bond Clean</li>';
    form.querySelectorAll('input[name="addons[]"]:checked').forEach(addon => {
      servicesList.insertAdjacentHTML('beforeend', `<li>${addon.value}</li>`);
    });
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    setText('review-name', form['full-name'].value);
    setText('review-email', form.email.value);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    const formData = new FormData(form);
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString(),
    })
      .then(() => {
        if (formArea) formArea.style.display = 'none';
        if (successMessage) successMessage.style.display = 'block';
      })
      .catch(() => alert('Form submission failed. Please try again.'));
  });

  form.addEventListener('click', (e) => {
    if (e.target.closest('.next-step')) {
      if (validateStep(currentStep)) {
        currentStep++;
        updateUI();
      }
    } else if (e.target.closest('.prev-step')) {
      if (currentStep > 1) {
        currentStep--;
        updateUI();
      }
    }
  });

  form.querySelectorAll('.form-checkbox-label').forEach(label => {
    label.addEventListener('click', () => {
      const checkbox = label.querySelector('input');
      label.classList.toggle('selected', checkbox.checked);
    });
  });

  if (newQuoteBtn) {
    newQuoteBtn.addEventListener('click', () => {
      form.reset();
      currentStep = 1;
      if (formArea) formArea.style.display = 'block';
      if (successMessage) successMessage.style.display = 'none';
      updateUI();
    });
  }

  updateUI();
});
