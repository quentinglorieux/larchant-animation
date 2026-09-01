---
title: Nous contacter
date: 2020-01-01
draft: false
language: fr
description: Formulaire de contact
---

<!-- @format -->

<section class="lg:pb-24">
  <div class="max-w-screen-md px-4 mx-auto">
      <p class="mb-8 font-light text-center text-gray-500 lg:mb-16 dark:text-gray-400 sm:text-xl">
      Vous souhaitez prendre contact avec nous pour vous informer ou nous rejoindre.</p>
      <form name="contact" id="contact-form" method="POST" action="https://script.google.com/macros/s/AKfycbxTJwyga8hOEfVUfCIaMFl0QfnqmLoxAsra4XXpp9SebNJyQpVnkHS7lciGBhaDvxDKfg/exec" class="space-y-8">
          <input type="hidden" name="form" value="contact">
          <input type="text" name="bot-field" style="display:none" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="my-4">
              <label for="email" class="block mb-2 font-medium text-gray-900 text-md dark:text-gray-300"><strong>Votre Email:</strong></label>
              <input type="email" name="email" class="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-md rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500 dark:shadow-sm-light" placeholder="contact@votre-email.fr" required>
          </div>
          <div class="my-4">
              <label for="subject" class="block mb-2 font-medium text-gray-900 text-md dark:text-gray-300"><strong>Sujet:</strong></label>
              <input type="text" name="subject" class="block w-full p-3 text-gray-900 border border-gray-300 rounded-lg shadow-sm text-md bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500 dark:shadow-sm-light" placeholder="De quoi voulez vous nous parler ?" required>
          </div>
          <div class="my-4 sm:col-span-2">
              <label for="message" class="block mb-2 font-medium text-gray-900 text-md dark:text-gray-400"><strong>Votre message:</strong></label>
              <textarea id="message" name="message" rows="8" class="block p-2.5 w-full text-md text-gray-900 bg-gray-50 rounded-lg shadow-sm border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500" placeholder="Laissez nous un message..."></textarea>
          </div>
          <div class="mt-6 lg:pb-16">
             <button type="submit" class="px-5 py-3 font-bold text-center text-white bg-indigo-600 rounded-lg text-md sm:w-fit hover:bg-indigo-800 focus:ring-4 focus:outline-none focus:ring-indigo-300 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800">Envoyer</button>
             <p id="contact-msg" class="mt-4 font-medium text-red-600 dark:text-red-400" hidden></p>
          </div>
      </form>
  </div>
</section>

<script>
  (function () {
    var form = document.getElementById('contact-form');
    if (!form) return;
    var msg = document.getElementById('contact-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      var data = new URLSearchParams(new FormData(form));
      data.append('t', ['lar', 'chant', '-', '2026'].join(''));
      fetch(form.action, { method: 'POST', body: data })
        .then(function (r) { return r.text(); })
        .then(function (t) {
          if (t.trim() === 'ok') {
            window.location.href = '/merci/';
          } else {
            msg.textContent = "L'envoi a échoué, merci de vérifier votre adresse email.";
            msg.hidden = false;
            btn.disabled = false;
          }
        })
        .catch(function () {
          msg.textContent = "Une erreur est survenue, merci de réessayer plus tard.";
          msg.hidden = false;
          btn.disabled = false;
        });
    });
  })();
</script>
