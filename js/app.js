/**
 * Application Note de Frais
 * Gestion des notes de frais avec génération de PDF
 */

// ==========================================================================
// État de l'application
// ==========================================================================

const state = {
  expenses: [],
  currentExpenseType: null,
  totalKilometers: 0, // Pour le calcul du barème kilométrique
  currentRequestId: null // ID de la demande en cours d'édition
};

// ==========================================================================
// Clé localStorage
// ==========================================================================

const STORAGE_KEY = 'cse_younup_note_frais';

// ==========================================================================
// Barème kilométrique 2024
// ==========================================================================

const BAREME_KM = {
  3: { // 3 CV et moins
    seuil1: 5000,
    seuil2: 20000,
    coef1: 0.529,
    coef2: 0.316,
    bonus2: 1065,
    coef3: 0.370
  },
  4: { // 4 CV
    seuil1: 5000,
    seuil2: 20000,
    coef1: 0.606,
    coef2: 0.340,
    bonus2: 1330,
    coef3: 0.407
  },
  5: { // 5 CV
    seuil1: 5000,
    seuil2: 20000,
    coef1: 0.636,
    coef2: 0.357,
    bonus2: 1395,
    coef3: 0.427
  },
  6: { // 6 CV
    seuil1: 5000,
    seuil2: 20000,
    coef1: 0.665,
    coef2: 0.374,
    bonus2: 1457,
    coef3: 0.447
  },
  7: { // 7 CV et plus
    seuil1: 5000,
    seuil2: 20000,
    coef1: 0.697,
    coef2: 0.394,
    bonus2: 1515,
    coef3: 0.470
  }
};

// ==========================================================================
// Types de frais
// ==========================================================================

const EXPENSE_TYPES = {
  hotel: { label: 'Hôtel', icon: '🏨' },
  parking: { label: 'Parking', icon: '🅿️' },
  repas: { label: 'Repas (midi)', icon: '🍽️' },
  repasSoir: { label: 'Repas du soir', icon: '🌙' },
  transport: { label: 'Transport', icon: '🚆' },
  evenement: { label: 'Événement', icon: '🎉' },
  fonctionnement: { label: 'Fonctionnement CSE', icon: '🏢' },
  divers: { label: 'Divers', icon: '📦' },
  fraisKm: { label: 'Frais kilométriques', icon: '🚗' }
};

// ==========================================================================
// Éléments DOM
// ==========================================================================

const DOM = {
  // Formulaire principal
  nom: document.getElementById('nom'),
  prenom: document.getElementById('prenom'),
  adresse: document.getElementById('adresse'),
  email: document.getElementById('email'),
  telephone: document.getElementById('telephone'),
  dateDemande: document.getElementById('dateDemande'),
  totalTTC: document.getElementById('totalTTC'),

  // Liste des frais
  expenseType: document.getElementById('expenseType'),
  btnAddExpense: document.getElementById('btnAddExpense'),
  expensesList: document.getElementById('expensesList'),

  // Récapitulatif
  summaryHT: document.getElementById('summaryHT'),
  summaryTVA: document.getElementById('summaryTVA'),
  summaryTTC: document.getElementById('summaryTTC'),
  summaryTTCRow: document.getElementById('summaryTTCRow'),
  summaryTTCLabel: document.getElementById('summaryTTCLabel'),
  summaryDueToCSE: document.getElementById('summaryDueToCSE'),
  summaryDueAmount: document.getElementById('summaryDueAmount'),
  summaryNetRow: document.getElementById('summaryNetRow'),
  summaryNetAmount: document.getElementById('summaryNetAmount'),

  // Rappels justificatifs
  justificatifsReminder: document.getElementById('justificatifsReminder'),
  reminderCarteGrise: document.getElementById('reminderCarteGrise'),
  reminderFactures: document.getElementById('reminderFactures'),

  // Boutons
  btnReset: document.getElementById('btnReset'),
  btnGeneratePDF: document.getElementById('btnGeneratePDF'),
  btnSaveDraft: document.getElementById('btnSaveDraft'),
  btnViewSaved: document.getElementById('btnViewSaved'),

  // Indicateur d'édition
  editingIndicator: document.getElementById('editingIndicator'),
  editingDate: document.getElementById('editingDate'),
  btnCancelEdit: document.getElementById('btnCancelEdit'),

  // Modal demandes sauvegardées
  modalSavedRequests: document.getElementById('modalSavedRequests'),
  savedRequestsList: document.getElementById('savedRequestsList'),
  btnCloseSaved: document.getElementById('btnCloseSaved'),

  // Modal frais standard
  modalExpense: document.getElementById('modalExpense'),
  modalTitle: document.getElementById('modalTitle'),
  formExpense: document.getElementById('formExpense'),
  expMontantHT: document.getElementById('expMontantHT'),
  expTauxTVA: document.getElementById('expTauxTVA'),
  expTVA: document.getElementById('expTVA'),
  expMontantTTC: document.getElementById('expMontantTTC'),
  expDate: document.getElementById('expDate'),
  expRaison: document.getElementById('expRaison'),
  groupRepasInfo: document.getElementById('groupRepasInfo'),
  repasInfoText: document.getElementById('repasInfoText'),
  expReference: document.getElementById('expReference'),
  expFournisseur: document.getElementById('expFournisseur'),
  expPaiement: document.getElementById('expPaiement'),
  expEditId: document.getElementById('expEditId'),
  btnCancelExpense: document.getElementById('btnCancelExpense'),
  btnSubmitExpense: document.getElementById('btnSubmitExpense'),

  // Modal frais kilométriques
  modalFraisKm: document.getElementById('modalFraisKm'),
  modalKmTitle: document.getElementById('modalKmTitle'),
  formFraisKm: document.getElementById('formFraisKm'),
  kmDate: document.getElementById('kmDate'),
  kmRaison: document.getElementById('kmRaison'),
  kmDepart: document.getElementById('kmDepart'),
  kmArrivee: document.getElementById('kmArrivee'),
  kmDistance: document.getElementById('kmDistance'),
  kmAllerRetour: document.getElementById('kmAllerRetour'),
  kmImmatriculation: document.getElementById('kmImmatriculation'),
  kmPuissance: document.getElementById('kmPuissance'),
  kmTotalDistance: document.getElementById('kmTotalDistance'),
  kmMontant: document.getElementById('kmMontant'),
  kmEditId: document.getElementById('kmEditId'),
  btnCancelKm: document.getElementById('btnCancelKm'),
  btnSubmitKm: document.getElementById('btnSubmitKm')
};

// ==========================================================================
// Initialisation
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  attachEventListeners();
});

function initializeApp() {
  // Définir la date du jour par défaut
  const today = new Date().toISOString().split('T')[0];
  DOM.dateDemande.value = today;

  // Afficher l'état vide
  renderExpensesList();
  updateSummary();
}

function attachEventListeners() {
  // Bouton ajouter un frais
  DOM.btnAddExpense.addEventListener('click', handleAddExpense);

  // Modal frais standard
  DOM.formExpense.addEventListener('submit', handleSubmitExpense);
  DOM.btnCancelExpense.addEventListener('click', () => closeModal(DOM.modalExpense));
  DOM.modalExpense.querySelector('.close-modal').addEventListener('click', () => closeModal(DOM.modalExpense));

  // Calcul automatique TTC
  DOM.expMontantHT.addEventListener('input', calculateTVAandTTC);
  DOM.expTauxTVA.addEventListener('change', calculateTVAandTTC);

  // Modal frais kilométriques
  DOM.formFraisKm.addEventListener('submit', handleSubmitFraisKm);
  DOM.btnCancelKm.addEventListener('click', () => closeModal(DOM.modalFraisKm));
  DOM.modalFraisKm.querySelector('.close-modal').addEventListener('click', () => closeModal(DOM.modalFraisKm));

  // Calcul automatique frais km
  DOM.kmDistance.addEventListener('input', calculateKmAmount);
  DOM.kmAllerRetour.addEventListener('change', calculateKmAmount);
  DOM.kmPuissance.addEventListener('change', calculateKmAmount);

  // Boutons principaux
  DOM.btnReset.addEventListener('click', handleReset);
  DOM.btnGeneratePDF.addEventListener('click', handleGeneratePDF);
  DOM.btnSaveDraft.addEventListener('click', handleSaveDraft);
  DOM.btnViewSaved.addEventListener('click', openSavedRequestsModal);

  // Indicateur d'édition
  DOM.btnCancelEdit.addEventListener('click', handleCancelEdit);

  // Modal demandes sauvegardées
  DOM.btnCloseSaved.addEventListener('click', () => closeModal(DOM.modalSavedRequests));
  DOM.modalSavedRequests.querySelector('.close-modal').addEventListener('click', () => closeModal(DOM.modalSavedRequests));

  // Fermer modal en cliquant en dehors
  DOM.modalExpense.addEventListener('click', (e) => {
    if (e.target === DOM.modalExpense) closeModal(DOM.modalExpense);
  });
  DOM.modalFraisKm.addEventListener('click', (e) => {
    if (e.target === DOM.modalFraisKm) closeModal(DOM.modalFraisKm);
  });
}

// ==========================================================================
// Gestion des modales
// ==========================================================================

function openModal(modal) {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// ==========================================================================
// Gestion des frais
// ==========================================================================

function handleAddExpense() {
  const type = DOM.expenseType.value;

  if (!type) {
    showToast('Veuillez sélectionner un type de frais', 'error');
    return;
  }

  state.currentExpenseType = type;

  if (type === 'fraisKm') {
    openFraisKmModal();
  } else {
    openExpenseModal(type);
  }
}

function openExpenseModal(type, editId = null) {
  const typeInfo = EXPENSE_TYPES[type];

  // Réinitialiser le formulaire
  DOM.formExpense.reset();
  DOM.expEditId.value = editId || '';
  DOM.expDate.value = new Date().toISOString().split('T')[0];
  DOM.expTauxTVA.value = '20'; // Taux par défaut

  // Afficher/masquer le message pour les repas
  if (type === 'repasSoir') {
    DOM.groupRepasInfo.style.display = 'block';
    DOM.repasInfoText.textContent = '⚠️ Les repas du soir lors de déplacements sont remboursés à hauteur de 25€ TTC maximum. Tout dépassement reste à la charge de l\'élu. Si le repas a été payé par carte CSE et dépasse 25€, la différence sera déduite de votre remboursement.';
  } else if (type === 'repas') {
    DOM.groupRepasInfo.style.display = 'block';
    DOM.repasInfoText.textContent = 'ℹ️ Les repas du midi sont pris en charge à 100% par le CSE, sans plafond.';
  } else {
    DOM.groupRepasInfo.style.display = 'none';
  }

  // Titre de la modal et texte du bouton
  if (editId) {
    DOM.modalTitle.textContent = `${typeInfo.icon} Modifier un frais - ${typeInfo.label}`;
    DOM.btnSubmitExpense.textContent = 'Enregistrer';

    // Charger les données existantes
    const expense = state.expenses.find(e => e.id === editId);
    if (expense) {
      DOM.expMontantHT.value = expense.montantHT;
      DOM.expTauxTVA.value = (expense.tauxTVA !== undefined && expense.tauxTVA !== null) ? String(expense.tauxTVA) : '20';
      DOM.expTVA.value = expense.tva;
      DOM.expMontantTTC.value = expense.montantTTC;
      DOM.expDate.value = expense.date;
      DOM.expRaison.value = expense.raison;
      DOM.expReference.value = expense.reference || '';
      DOM.expFournisseur.value = expense.fournisseur;
      DOM.expPaiement.value = expense.paiement;
    }
  } else {
    DOM.modalTitle.textContent = `${typeInfo.icon} Ajouter un frais - ${typeInfo.label}`;
    DOM.btnSubmitExpense.textContent = 'Ajouter';
  }

  openModal(DOM.modalExpense);
}

function openFraisKmModal(editId = null) {
  // Réinitialiser le formulaire
  DOM.formFraisKm.reset();
  DOM.kmEditId.value = editId || '';
  DOM.kmDate.value = new Date().toISOString().split('T')[0];
  DOM.kmTotalDistance.textContent = '0';
  DOM.kmMontant.textContent = '0,00';

  // Titre de la modal et texte du bouton
  if (editId) {
    DOM.modalKmTitle.textContent = '🚗 Modifier des frais kilométriques';
    DOM.btnSubmitKm.textContent = 'Enregistrer';

    // Charger les données existantes
    const expense = state.expenses.find(e => e.id === editId);
    if (expense && expense.kmDetails) {
      DOM.kmDate.value = expense.date;
      DOM.kmRaison.value = expense.raison;
      DOM.kmDepart.value = expense.kmDetails.depart;
      DOM.kmArrivee.value = expense.kmDetails.arrivee;
      DOM.kmDistance.value = expense.kmDetails.distance;
      DOM.kmAllerRetour.value = expense.kmDetails.allerRetour ? 'aller-retour' : 'aller';
      DOM.kmImmatriculation.value = expense.kmDetails.immatriculation;
      DOM.kmPuissance.value = expense.kmDetails.puissance;

      // Recalculer pour l'affichage (sans compter les km de ce frais)
      const tempKm = state.totalKilometers - expense.kmDetails.totalDistance;
      state.totalKilometers = tempKm;
      calculateKmAmount();
      state.totalKilometers = tempKm; // Garder la valeur temporaire pour le calcul correct
    }
  } else {
    DOM.modalKmTitle.textContent = '🚗 Ajouter des frais kilométriques';
    DOM.btnSubmitKm.textContent = 'Ajouter';
  }

  openModal(DOM.modalFraisKm);
}

function handleSubmitExpense(e) {
  e.preventDefault();

  const type = state.currentExpenseType;
  const typeInfo = EXPENSE_TYPES[type];
  const editId = DOM.expEditId.value ? parseInt(DOM.expEditId.value) : null;

  let montantHT = parseFloat(DOM.expMontantHT.value) || 0;
  let tauxTVA = parseFloat(DOM.expTauxTVA.value) || 0;
  let tva = parseFloat(DOM.expTVA.value) || 0;
  let montantTTC = parseFloat(DOM.expMontantTTC.value) || 0;
  let montantRembourse = montantTTC;
  let plafonne = false;
  let montantDuAuCSE = 0;
  const paiement = DOM.expPaiement.value;

  // Plafonnement des repas du soir à 25€ TTC (les repas midi sont pris à 100% par le CSE)
  if (type === 'repasSoir' && montantTTC > 25) {
    plafonne = true;
    if (paiement === 'carte_cse') {
      // Payé par carte CSE et dépassement : l'élu doit rembourser le surplus au CSE
      montantRembourse = 0; // Pas de remboursement vers l'élu
      montantDuAuCSE = Math.round((montantTTC - 25) * 100) / 100;
    } else {
      // Payé par l'élu : remboursement plafonné à 25€
      montantRembourse = 25;
    }
  }

  const expense = {
    id: editId || Date.now(),
    type: type,
    typeLabel: typeInfo.label,
    icon: typeInfo.icon,
    montantHT: montantHT,
    tauxTVA: tauxTVA,
    tva: tva,
    montantTTC: montantTTC,
    montantRembourse: montantRembourse,
    plafonne: plafonne,
    montantDuAuCSE: montantDuAuCSE,
    date: DOM.expDate.value,
    raison: DOM.expRaison.value,
    reference: DOM.expReference.value,
    fournisseur: DOM.expFournisseur.value,
    paiement: paiement,
    isKm: false
  };

  if (editId) {
    // Mode édition : remplacer le frais existant
    const index = state.expenses.findIndex(e => e.id === editId);
    if (index !== -1) {
      state.expenses[index] = expense;
    }
    showToast('Frais modifié avec succès', 'success');
  } else {
    // Mode ajout
    state.expenses.push(expense);
    if (plafonne && paiement === 'carte_cse') {
      showToast(`Frais ajouté - Repas du soir payé par carte CSE dépassant 25€ : ${formatCurrency(montantDuAuCSE)}€ déduits du remboursement`, 'warning');
    } else if (plafonne) {
      showToast(`Frais ajouté - Repas du soir plafonné à 25€ (${formatCurrency(montantTTC - 25)}€ non remboursés)`, 'success');
    } else {
      showToast('Frais ajouté avec succès', 'success');
    }
  }

  closeModal(DOM.modalExpense);
  renderExpensesList();
  updateSummary();
}

function handleSubmitFraisKm(e) {
  e.preventDefault();

  const editId = DOM.kmEditId.value ? parseInt(DOM.kmEditId.value) : null;
  const distance = parseFloat(DOM.kmDistance.value) || 0;
  const isAllerRetour = DOM.kmAllerRetour.value === 'aller-retour';
  const totalDistance = isAllerRetour ? distance * 2 : distance;
  const puissance = parseInt(DOM.kmPuissance.value);

  // Si on édite, on a déjà ajusté totalKilometers dans openFraisKmModal
  const montant = calculateKmReimbursement(totalDistance, puissance);

  const expense = {
    id: editId || Date.now(),
    type: 'fraisKm',
    typeLabel: 'Frais kilométriques',
    icon: '🚗',
    montantHT: montant,
    tva: 0,
    montantTTC: montant,
    date: DOM.kmDate.value,
    lieu: `${DOM.kmDepart.value} → ${DOM.kmArrivee.value}`,
    raison: DOM.kmRaison.value,
    reference: '',
    fournisseur: 'Véhicule personnel',
    paiement: 'autre',
    isKm: true,
    kmDetails: {
      depart: DOM.kmDepart.value,
      arrivee: DOM.kmArrivee.value,
      distance: distance,
      allerRetour: isAllerRetour,
      totalDistance: totalDistance,
      immatriculation: DOM.kmImmatriculation.value,
      puissance: puissance
    }
  };

  if (editId) {
    // Mode édition : récupérer l'ancien frais pour ajuster les km
    const oldExpense = state.expenses.find(e => e.id === editId);
    if (oldExpense && oldExpense.kmDetails) {
      // totalKilometers a déjà été ajusté dans openFraisKmModal
    }
    const index = state.expenses.findIndex(e => e.id === editId);
    if (index !== -1) {
      state.expenses[index] = expense;
    }
    state.totalKilometers += totalDistance;
    showToast('Frais kilométriques modifiés avec succès', 'success');
  } else {
    state.expenses.push(expense);
    state.totalKilometers += totalDistance;
    showToast('Frais kilométriques ajoutés avec succès', 'success');
  }

  closeModal(DOM.modalFraisKm);
  renderExpensesList();
  updateSummary();
}

function deleteExpense(id) {
  const expense = state.expenses.find(e => e.id === id);

  if (expense && expense.isKm && expense.kmDetails) {
    state.totalKilometers -= expense.kmDetails.totalDistance;
  }

  state.expenses = state.expenses.filter(e => e.id !== id);
  renderExpensesList();
  updateSummary();
  showToast('Frais supprimé', 'success');
}

// ==========================================================================
// Calculs
// ==========================================================================

function calculateTVAandTTC() {
  const ht = parseFloat(DOM.expMontantHT.value) || 0;
  const tauxTVA = parseFloat(DOM.expTauxTVA.value) || 0;
  const tva = ht * (tauxTVA / 100);
  DOM.expTVA.value = tva.toFixed(2);
  DOM.expMontantTTC.value = (ht + tva).toFixed(2);
}

function calculateKmAmount() {
  const distance = parseFloat(DOM.kmDistance.value) || 0;
  const isAllerRetour = DOM.kmAllerRetour.value === 'aller-retour';
  const totalDistance = isAllerRetour ? distance * 2 : distance;
  const puissance = parseInt(DOM.kmPuissance.value) || 0;

  DOM.kmTotalDistance.textContent = totalDistance;

  if (puissance > 0) {
    const montant = calculateKmReimbursement(totalDistance, puissance);
    DOM.kmMontant.textContent = formatCurrency(montant);
  } else {
    DOM.kmMontant.textContent = '0,00';
  }
}

function calculateKmReimbursement(distance, puissance) {
  // Distance cumulée avec les frais km précédents
  const previousKm = state.totalKilometers;
  const newTotalKm = previousKm + distance;

  const bareme = BAREME_KM[puissance];
  if (!bareme) return 0;

  let montant = 0;

  // Calcul selon le barème progressif
  // On calcule le montant pour la nouvelle distance en tenant compte du cumul
  if (newTotalKm <= bareme.seuil1) {
    // Tout dans la tranche 1
    montant = distance * bareme.coef1;
  } else if (previousKm >= bareme.seuil2) {
    // Tout dans la tranche 3
    montant = distance * bareme.coef3;
  } else if (previousKm >= bareme.seuil1) {
    // Déjà dans tranche 2 ou 3
    if (newTotalKm <= bareme.seuil2) {
      // Tout dans tranche 2
      montant = distance * bareme.coef2;
    } else {
      // Partie en tranche 2, partie en tranche 3
      const distTranche2 = bareme.seuil2 - previousKm;
      const distTranche3 = distance - distTranche2;
      montant = (distTranche2 * bareme.coef2) + (distTranche3 * bareme.coef3);
    }
  } else {
    // Commence en tranche 1
    if (newTotalKm <= bareme.seuil1) {
      // Tout en tranche 1
      montant = distance * bareme.coef1;
    } else if (newTotalKm <= bareme.seuil2) {
      // Partie tranche 1, partie tranche 2
      const distTranche1 = bareme.seuil1 - previousKm;
      const distTranche2 = distance - distTranche1;
      montant = (distTranche1 * bareme.coef1) + (distTranche2 * bareme.coef2);
    } else {
      // Tranche 1, 2 et 3
      const distTranche1 = bareme.seuil1 - previousKm;
      const distTranche2 = bareme.seuil2 - bareme.seuil1;
      const distTranche3 = newTotalKm - bareme.seuil2;
      montant = (distTranche1 * bareme.coef1) + (distTranche2 * bareme.coef2) + (distTranche3 * bareme.coef3);
    }
  }

  return Math.round(montant * 100) / 100;
}

// ==========================================================================
// Rendu de la liste des frais
// ==========================================================================

function renderExpensesList() {
  if (state.expenses.length === 0) {
    DOM.expensesList.innerHTML = `
      <div class="empty-state">
        <p>Aucun frais ajouté pour le moment</p>
        <p>Sélectionnez un type de frais et cliquez sur "Ajouter un frais"</p>
      </div>
    `;
    return;
  }

  DOM.expensesList.innerHTML = state.expenses.map(expense => {
    const isCse = expense.paiement === 'carte_cse';
    const paiementLabel = getPaiementLabel(expense.paiement);
    const badgeClass = getBadgeClass(expense.paiement);
    const montantAffiche = expense.montantRembourse !== undefined ? expense.montantRembourse : expense.montantTTC;

    return `
      <div class="expense-item ${isCse ? 'cse' : ''}" data-id="${expense.id}">
        <div class="expense-info">
          <h4>${expense.icon} ${expense.typeLabel}</h4>
          <div class="expense-details">
            <span>📅 ${formatDate(expense.date)}</span>
            <span>🏢 ${expense.fournisseur}</span>
            <span>📄 ${expense.reference}</span>
            ${expense.isKm ? `<span>🚗 ${expense.kmDetails.totalDistance} km</span>` : ''}
            <span class="badge ${badgeClass}">${paiementLabel}</span>
          </div>
          ${expense.raison ? `<div class="expense-raison">💬 ${expense.raison}</div>` : ''}
        </div>
        <div class="expense-amount">
          <div class="ttc">${formatCurrency(montantAffiche)} €</div>
          ${!expense.isKm ? `<div class="ht-tva">HT: ${formatCurrency(expense.montantHT)} € | TVA: ${formatCurrency(expense.tva)} €</div>` : ''}
          ${expense.plafonne ? `<div class="ht-tva" style="color: #f59e0b;">Plafonné (TTC réel: ${formatCurrency(expense.montantTTC)}€)</div>` : ''}
          ${expense.montantDuAuCSE > 0 ? `<div class="ht-tva" style="color: #ef4444; font-weight: bold;">⚠️ ${formatCurrency(expense.montantDuAuCSE)}€ déduits (dépassement repas du soir)</div>` : ''}
          ${isCse && !expense.montantDuAuCSE ? '<div class="ht-tva" style="color: #f59e0b;">Non comptabilisé</div>' : ''}
          ${isCse && expense.montantDuAuCSE > 0 ? '<div class="ht-tva" style="color: #f59e0b;">Payé par carte CSE (dépassement plafond repas du soir)</div>' : ''}
        </div>
        <div class="expense-actions">
          <button type="button" onclick="editExpense(${expense.id})" title="Modifier">✏️</button>
          <button type="button" onclick="deleteExpense(${expense.id})" title="Supprimer">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function getPaiementLabel(paiement) {
  switch (paiement) {
    case 'carte_perso': return 'Carte perso';
    case 'carte_cse': return 'Carte CSE';
    case 'virement': return 'Virement';
    case 'espece': return 'Espèces';
    case 'autre': return 'Autre';
    default: return paiement;
  }
}

function getBadgeClass(paiement) {
  switch (paiement) {
    case 'carte_perso': return 'badge-perso';
    case 'carte_cse': return 'badge-cse';
    case 'virement': return 'badge-virement';
    case 'espece': return 'badge-espece';
    case 'autre': return 'badge-autre';
    default: return '';
  }
}

// ==========================================================================
// Mise à jour du récapitulatif
// ==========================================================================

function updateSummary() {
  let totalHT = 0;
  let totalTVA = 0;
  let totalTTC = 0;
  let totalDuAuCSE = 0;

  state.expenses.forEach(expense => {
    // Cumuler les montants dus au CSE (repas carte CSE dépassant 25€)
    if (expense.montantDuAuCSE > 0) {
      totalDuAuCSE += expense.montantDuAuCSE;
    }

    // Ne pas comptabiliser les paiements par carte CSE
    if (expense.paiement !== 'carte_cse') {
      // Utiliser le montant remboursé (plafonné) si disponible
      const montantRembourse = expense.montantRembourse !== undefined ? expense.montantRembourse : expense.montantTTC;

      if (expense.plafonne) {
        // Pour les frais plafonnés, on utilise directement le montant remboursé
        totalTTC += montantRembourse;
        // On estime HT et TVA proportionnellement
        const ratio = montantRembourse / expense.montantTTC;
        totalHT += expense.montantHT * ratio;
        totalTVA += expense.tva * ratio;
      } else {
        totalHT += expense.montantHT;
        totalTVA += expense.tva;
        totalTTC += expense.montantTTC;
      }
    }
  });

  DOM.summaryHT.textContent = formatCurrency(totalHT) + ' €';
  DOM.summaryTVA.textContent = formatCurrency(totalTVA) + ' €';
  DOM.summaryTTC.textContent = formatCurrency(totalTTC) + ' €';

  // Cas où il y a à la fois un remboursement et un montant dû au CSE → afficher le net
  if (totalDuAuCSE > 0 && totalTTC > 0) {
    const montantNet = Math.round((totalTTC - totalDuAuCSE) * 100) / 100;

    // Changer le libellé du total TTC brut
    DOM.summaryTTCLabel.textContent = 'Sous-total TTC des frais à rembourser :';

    // Afficher la ligne déduction
    DOM.summaryDueToCSE.classList.remove('hidden');
    DOM.summaryDueAmount.textContent = '- ' + formatCurrency(totalDuAuCSE) + ' €';

    // Afficher la ligne net
    DOM.summaryNetRow.classList.remove('hidden');
    if (montantNet >= 0) {
      DOM.summaryNetAmount.textContent = formatCurrency(montantNet) + ' €';
      DOM.summaryNetRow.className = 'summary-row net-total net-positive';
    } else {
      DOM.summaryNetAmount.textContent = '- ' + formatCurrency(Math.abs(montantNet)) + ' € (à rembourser au CSE)';
      DOM.summaryNetRow.className = 'summary-row net-total net-negative';
    }

    DOM.totalTTC.value = formatCurrency(montantNet) + ' € (net)';
  } else if (totalDuAuCSE > 0 && totalTTC === 0) {
    // Seulement un montant dû au CSE, pas de remboursement
    DOM.summaryTTCLabel.textContent = 'Total TTC à rembourser par le CSE :';
    DOM.summaryDueToCSE.classList.remove('hidden');
    DOM.summaryDueAmount.textContent = formatCurrency(totalDuAuCSE) + ' €';
    DOM.summaryNetRow.classList.remove('hidden');
    DOM.summaryNetRow.className = 'summary-row net-total net-negative';
    DOM.summaryNetAmount.textContent = '- ' + formatCurrency(totalDuAuCSE) + ' € (à rembourser au CSE)';
    DOM.totalTTC.value = '- ' + formatCurrency(totalDuAuCSE) + ' € (dû au CSE)';
  } else {
    // Pas de montant dû au CSE → affichage classique
    DOM.summaryTTCLabel.textContent = 'Total TTC à rembourser par le CSE :';
    DOM.summaryDueToCSE.classList.add('hidden');
    DOM.summaryDueAmount.textContent = '0,00 €';
    DOM.summaryNetRow.classList.add('hidden');
    DOM.totalTTC.value = formatCurrency(totalTTC) + ' €';
  }

  // Mettre à jour les rappels de justificatifs
  updateJustificatifsReminder();
}

// ==========================================================================
// Mise à jour des rappels justificatifs
// ==========================================================================

function updateJustificatifsReminder() {
  const hasKmExpenses = state.expenses.some(e => e.isKm);
  const hasOtherExpenses = state.expenses.some(e => !e.isKm);

  // Afficher/masquer le conteneur principal
  if (state.expenses.length > 0) {
    DOM.justificatifsReminder.classList.remove('hidden');
  } else {
    DOM.justificatifsReminder.classList.add('hidden');
  }

  // Afficher/masquer le rappel carte grise
  if (hasKmExpenses) {
    DOM.reminderCarteGrise.classList.remove('hidden');
  } else {
    DOM.reminderCarteGrise.classList.add('hidden');
  }

  // Afficher/masquer le rappel factures
  if (hasOtherExpenses) {
    DOM.reminderFactures.classList.remove('hidden');
  } else {
    DOM.reminderFactures.classList.add('hidden');
  }
}

// ==========================================================================
// Réinitialisation
// ==========================================================================

function handleReset() {
  if (confirm('Êtes-vous sûr de vouloir réinitialiser le formulaire ? Toutes les données seront perdues.')) {
    // Réinitialiser l'état
    state.expenses = [];
    state.totalKilometers = 0;
    state.currentRequestId = null;

    // Masquer l'indicateur d'édition
    DOM.editingIndicator.classList.add('hidden');

    // Réinitialiser les champs
    DOM.nom.value = '';
    DOM.prenom.value = '';
    DOM.adresse.value = '';
    DOM.email.value = '';
    DOM.telephone.value = '';
    DOM.dateDemande.value = new Date().toISOString().split('T')[0];
    DOM.expenseType.value = '';

    renderExpensesList();
    updateSummary();
    showToast('Formulaire réinitialisé', 'success');
  }
}

// ==========================================================================
// Gestion du localStorage - Sauvegarde des demandes
// ==========================================================================

function getSavedRequests() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveRequestsToStorage(requests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

function getCurrentRequestData() {
  return {
    id: state.currentRequestId || Date.now(),
    savedAt: new Date().toISOString(),
    personal: {
      nom: DOM.nom.value,
      prenom: DOM.prenom.value,
      adresse: DOM.adresse.value,
      email: DOM.email.value,
      telephone: DOM.telephone.value
    },
    dateDemande: DOM.dateDemande.value,
    expenses: state.expenses,
    totalKilometers: state.totalKilometers
  };
}

function handleSaveDraft() {
  // Validation minimale
  if (!DOM.nom.value || !DOM.prenom.value) {
    showToast('Veuillez renseigner au moins votre nom et prénom', 'error');
    return;
  }

  const requestData = getCurrentRequestData();
  const requests = getSavedRequests();

  // Vérifier si on édite une demande existante
  const existingIndex = requests.findIndex(r => r.id === requestData.id);

  if (existingIndex !== -1) {
    // Mise à jour de la demande existante
    requests[existingIndex] = requestData;
    showToast('Demande mise à jour', 'success');
  } else {
    // Nouvelle demande
    requests.push(requestData);
    state.currentRequestId = requestData.id;
    updateEditingIndicator();
    showToast('Demande sauvegardée', 'success');
  }

  saveRequestsToStorage(requests);
}

function loadRequest(requestId) {
  const requests = getSavedRequests();
  const request = requests.find(r => r.id === requestId);

  if (!request) {
    showToast('Demande introuvable', 'error');
    return;
  }

  // Charger les données personnelles
  DOM.nom.value = request.personal.nom || '';
  DOM.prenom.value = request.personal.prenom || '';
  DOM.adresse.value = request.personal.adresse || '';
  DOM.email.value = request.personal.email || '';
  DOM.telephone.value = request.personal.telephone || '';
  DOM.dateDemande.value = request.dateDemande || new Date().toISOString().split('T')[0];

  // Charger les frais
  state.expenses = request.expenses || [];
  state.totalKilometers = request.totalKilometers || 0;
  state.currentRequestId = request.id;

  // Mettre à jour l'affichage
  renderExpensesList();
  updateSummary();
  updateEditingIndicator();

  // Fermer la modal
  closeModal(DOM.modalSavedRequests);

  showToast('Demande chargée', 'success');
}

function deleteRequest(requestId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
    return;
  }

  const requests = getSavedRequests();
  const filteredRequests = requests.filter(r => r.id !== requestId);
  saveRequestsToStorage(filteredRequests);

  // Si on supprime la demande en cours d'édition, réinitialiser
  if (state.currentRequestId === requestId) {
    state.currentRequestId = null;
    updateEditingIndicator();
  }

  // Rafraîchir la liste
  renderSavedRequestsList();
  showToast('Demande supprimée', 'success');
}

function openSavedRequestsModal() {
  renderSavedRequestsList();
  openModal(DOM.modalSavedRequests);
}

function renderSavedRequestsList() {
  const requests = getSavedRequests();

  if (requests.length === 0) {
    DOM.savedRequestsList.innerHTML = `
      <div class="empty-saved">
        <p>Aucune demande sauvegardée</p>
        <p>Vos demandes en cours seront affichées ici</p>
      </div>
    `;
    return;
  }

  // Trier par date de sauvegarde (plus récent en premier)
  requests.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  DOM.savedRequestsList.innerHTML = requests.map(request => {
    const totalTTC = calculateRequestTotal(request.expenses);
    const expenseCount = request.expenses.length;
    const isCurrentEdit = state.currentRequestId === request.id;

    return `
      <div class="saved-request-item ${isCurrentEdit ? 'editing' : ''}">
        <div class="saved-request-info">
          <h4>${request.personal.prenom} ${request.personal.nom} ${isCurrentEdit ? '(en cours)' : ''}</h4>
          <div class="request-details">
            <span>📅 ${formatDate(request.dateDemande)}</span>
            <span>📝 ${expenseCount} frais</span>
            <span>💾 Sauvegardé le ${formatDateTime(request.savedAt)}</span>
          </div>
          <div class="request-amount">Total : ${formatCurrency(totalTTC)} €</div>
        </div>
        <div class="saved-request-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="loadRequest(${request.id})">
            ✏️ Modifier
          </button>
          <button type="button" class="btn btn-danger btn-sm" onclick="deleteRequest(${request.id})">
            🗑️ Supprimer
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function calculateRequestTotal(expenses) {
  let total = 0;
  let totalDuAuCSE = 0;
  expenses.forEach(expense => {
    if (expense.montantDuAuCSE > 0) {
      totalDuAuCSE += expense.montantDuAuCSE;
    }
    if (expense.paiement !== 'carte_cse') {
      const montant = expense.montantRembourse !== undefined ? expense.montantRembourse : expense.montantTTC;
      total += montant;
    }
  });
  return Math.round((total - totalDuAuCSE) * 100) / 100;
}

function updateEditingIndicator() {
  if (state.currentRequestId) {
    const requests = getSavedRequests();
    const request = requests.find(r => r.id === state.currentRequestId);
    if (request) {
      DOM.editingDate.textContent = formatDate(request.dateDemande);
      DOM.editingIndicator.classList.remove('hidden');
    }
  } else {
    DOM.editingIndicator.classList.add('hidden');
  }
}

function handleCancelEdit() {
  // Créer une nouvelle demande (réinitialiser sans confirmation)
  state.expenses = [];
  state.totalKilometers = 0;
  state.currentRequestId = null;

  DOM.nom.value = '';
  DOM.prenom.value = '';
  DOM.adresse.value = '';
  DOM.email.value = '';
  DOM.telephone.value = '';
  DOM.dateDemande.value = new Date().toISOString().split('T')[0];
  DOM.expenseType.value = '';

  DOM.editingIndicator.classList.add('hidden');

  renderExpensesList();
  updateSummary();
  showToast('Nouvelle demande', 'success');
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('fr-FR') + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ==========================================================================
// Génération du PDF
// ==========================================================================

function handleGeneratePDF() {
  // Validation des champs obligatoires
  if (!DOM.nom.value || !DOM.prenom.value || !DOM.adresse.value || !DOM.email.value || !DOM.telephone.value) {
    showToast('Veuillez remplir toutes les informations personnelles', 'error');
    return;
  }

  if (state.expenses.length === 0) {
    showToast('Veuillez ajouter au moins un frais', 'error');
    return;
  }

  generatePDF();
}

function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Couleur CSE Younup
  const cseColor = [251, 190, 0]; // #fbbe00

  // Charger et ajouter le logo
  const logoImg = new Image();
  logoImg.src = 'img/logo.png';

  // Fonction pour générer le PDF après chargement du logo
  const generateContent = (hasLogo = false, logoWidth = 0, logoHeight = 0) => {
    // En-tête avec logo
    if (hasLogo && logoWidth > 0) {
      try {
        // Limiter la hauteur max du logo à 15mm
        const maxHeight = 15;
        const ratio = logoWidth / logoHeight;
        const finalHeight = Math.min(logoHeight, maxHeight);
        const finalWidth = finalHeight * ratio;
        doc.addImage(logoImg, 'PNG', 20, y, finalWidth, finalHeight);
      } catch (e) {
        console.log('Logo non chargé');
      }
    }

    // Informations CSE à droite
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cseColor[0], cseColor[1], cseColor[2]);
    doc.text('CSE Younup', pageWidth - 20, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text('7 mail Pablo Picasso', pageWidth - 20, y + 10, { align: 'right' });
    doc.text('44000 Nantes', pageWidth - 20, y + 14, { align: 'right' });

    y += 30;

    // Titre
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // Gris foncé
    doc.text('NOTE DE FRAIS', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Date de la demande
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Date de la demande : ${formatDate(DOM.dateDemande.value)}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Ligne séparatrice avec couleur CSE
    doc.setDrawColor(cseColor[0], cseColor[1], cseColor[2]);
    doc.setLineWidth(1);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Informations personnelles
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Informations de l\'élu', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Nom : ${DOM.nom.value}`, 20, y);
    doc.text(`Prénom : ${DOM.prenom.value}`, 110, y);
    y += 6;
    doc.text(`Adresse : ${DOM.adresse.value}`, 20, y);
    y += 6;
    doc.text(`Email : ${DOM.email.value}`, 20, y);
    doc.text(`Téléphone : ${DOM.telephone.value}`, 110, y);
    y += 12;

    // Tableau des frais standards
    const standardExpenses = state.expenses.filter(e => !e.isKm);

    if (standardExpenses.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Détail des frais', 20, y);
      y += 5;

      const tableData = standardExpenses.map(expense => {
        const montantRembourse = expense.montantRembourse !== undefined ? expense.montantRembourse : expense.montantTTC;
        const isCse = expense.paiement === 'carte_cse';

        // Colonne Remboursement :
        // - Carte CSE avec dépassement repas du soir → montant négatif (dû au CSE)
        // - Carte CSE sans dépassement → "-"
        // - Autre moyen de paiement avec plafond → montant plafonné
        // - Autre moyen de paiement sans plafond → montant TTC
        let rembCell;
        if (isCse && expense.montantDuAuCSE > 0) {
          rembCell = '-' + formatCurrency(expense.montantDuAuCSE) + ' €**';
        } else if (isCse) {
          rembCell = '-';
        } else if (expense.plafonne) {
          rembCell = formatCurrency(montantRembourse) + ' €*';
        } else {
          rembCell = formatCurrency(montantRembourse) + ' €';
        }

        // Colonne TVA : afficher le taux (ex: "20%") au lieu du montant
        const tauxTVACell = (expense.tauxTVA !== undefined && expense.tauxTVA !== null ? expense.tauxTVA : 20) + '%';

        return [
          expense.typeLabel,
          formatDate(expense.date),
          expense.fournisseur,
          expense.raison,
          expense.reference || '-',
          getPaiementLabel(expense.paiement),
          formatCurrency(expense.montantHT) + ' €',
          tauxTVACell,
          formatCurrency(expense.montantTTC) + ' €',
          rembCell
        ];
      });

      doc.autoTable({
        startY: y,
        head: [['Type', 'Date', 'Fournisseur', 'Raison', 'Réf.', 'Paiement', 'HT', 'TVA', 'TTC', 'Remb.']],
        body: tableData,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: cseColor, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [255, 248, 224] },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 18 },
          2: { cellWidth: 22 },
          3: { cellWidth: 28 },
          4: { cellWidth: 18 },
          5: { cellWidth: 18 },
          6: { cellWidth: 14 },
          7: { cellWidth: 12 },
          8: { cellWidth: 14 },
          9: { cellWidth: 16 }
        }
      });

      // Note pour les repas plafonnés
      const hasPlafonne = standardExpenses.some(e => e.plafonne);
      const hasDuAuCSE = standardExpenses.some(e => e.montantDuAuCSE > 0);
      if (hasPlafonne || hasDuAuCSE) {
        y = doc.lastAutoTable.finalY + 3;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        if (hasPlafonne) {
          doc.text('* Repas du soir plafonné à 25€ TTC - le surplus reste à la charge de l\'élu', 20, y);
          y += 4;
        }
        if (hasDuAuCSE) {
          doc.setTextColor(220, 38, 38);
          doc.text('** Repas du soir payé par carte CSE dépassant 25€ - le surplus est déduit du remboursement', 20, y);
          y += 4;
        }
        y += 3;
      } else {
        y = doc.lastAutoTable.finalY + 10;
      }
    }

    // Tableau des frais kilométriques
    const kmExpenses = state.expenses.filter(e => e.isKm);

    if (kmExpenses.length > 0) {
      // Vérifier si on a besoin d'une nouvelle page
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Frais kilométriques', 20, y);
      y += 5;

      const kmTableData = kmExpenses.map(expense => [
        formatDate(expense.date),
        expense.kmDetails.depart,
        expense.kmDetails.arrivee,
        expense.kmDetails.distance + ' km',
        expense.kmDetails.allerRetour ? 'A/R' : 'Aller',
        expense.kmDetails.totalDistance + ' km',
        expense.kmDetails.immatriculation,
        expense.kmDetails.puissance + ' CV',
        expense.raison,
        formatCurrency(expense.montantTTC) + ' €'
      ]);

      doc.autoTable({
        startY: y,
        head: [['Date', 'Départ', 'Arrivée', 'Dist.', 'Type', 'Total', 'Immat.', 'CV', 'Raison', 'Montant']],
        body: kmTableData,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        alternateRowStyles: { fillColor: [241, 245, 249] }
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    // Récapitulatif
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    // Calcul des totaux
    let totalHT = 0;
    let totalTVA = 0;
    let totalTTC = 0;
    let totalCSE = 0;
    let totalDuAuCSE = 0;

    state.expenses.forEach(expense => {
      // Cumuler les montants dus au CSE
      if (expense.montantDuAuCSE > 0) {
        totalDuAuCSE += expense.montantDuAuCSE;
      }

      if (expense.paiement === 'carte_cse') {
        totalCSE += expense.montantTTC;
      } else {
        // Utiliser le montant remboursé (plafonné) si disponible
        const montantRembourse = expense.montantRembourse !== undefined ? expense.montantRembourse : expense.montantTTC;

        if (expense.plafonne) {
          totalTTC += montantRembourse;
          const ratio = montantRembourse / expense.montantTTC;
          totalHT += expense.montantHT * ratio;
          totalTVA += expense.tva * ratio;
        } else {
          totalHT += expense.montantHT;
          totalTVA += expense.tva;
          totalTTC += expense.montantTTC;
        }
      }
    });

    // Box récapitulatif avec couleur CSE
    let boxHeight = 35;
    if (totalCSE > 0) boxHeight += 7;
    if (totalDuAuCSE > 0 && totalTTC > 0) boxHeight += 20; // Déduction + net
    else if (totalDuAuCSE > 0) boxHeight += 10;
    doc.setFillColor(255, 248, 224);
    doc.setDrawColor(cseColor[0], cseColor[1], cseColor[2]);
    doc.setLineWidth(1);
    doc.rect(20, y, pageWidth - 40, boxHeight, 'FD');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('RÉCAPITULATIF', 25, y + 8);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total HT : ${formatCurrency(totalHT)} €`, 25, y + 16);
    doc.text(`Total TVA : ${formatCurrency(totalTVA)} €`, 85, y + 16);

    let yOffset = 26;

    if (totalDuAuCSE > 0 && totalTTC > 0) {
      // Afficher le détail : sous-total, déduction, net
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(`Sous-total TTC des frais à rembourser : ${formatCurrency(totalTTC)} €`, 25, y + yOffset);

      yOffset += 7;
      doc.setTextColor(220, 38, 38);
      doc.text(`Déduction dépassement repas du soir (carte CSE) : - ${formatCurrency(totalDuAuCSE)} €`, 25, y + yOffset);

      yOffset += 9;
      const montantNet = Math.round((totalTTC - totalDuAuCSE) * 100) / 100;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      if (montantNet >= 0) {
        doc.setTextColor(cseColor[0], cseColor[1], cseColor[2]);
        doc.text(`MONTANT NET À PERCEVOIR PAR L'ÉLU : ${formatCurrency(montantNet)} €`, 25, y + yOffset);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text(`MONTANT NET DÛ AU CSE PAR L'ÉLU : ${formatCurrency(Math.abs(montantNet))} €`, 25, y + yOffset);
      }
    } else if (totalDuAuCSE > 0 && totalTTC === 0) {
      // Seulement un montant dû au CSE
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(`MONTANT DÛ AU CSE PAR L'ÉLU : ${formatCurrency(totalDuAuCSE)} €`, 25, y + yOffset);
    } else {
      // Cas normal sans déduction
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(cseColor[0], cseColor[1], cseColor[2]);
      doc.text(`TOTAL À REMBOURSER PAR LE CSE : ${formatCurrency(totalTTC)} €`, 25, y + yOffset);
    }

    if (totalCSE > 0) {
      yOffset += 7;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`(Non inclus : ${formatCurrency(totalCSE)} € payés par carte CSE)`, 25, y + yOffset);
    }

    y += boxHeight + 10;

    // Vérifier les types de frais pour les rappels
    const hasKmExpenses = state.expenses.some(e => e.isKm);
    const hasOtherExpenses = state.expenses.some(e => !e.isKm);

    // Calculer l'espace nécessaire pour la section signature
    // Justificatifs (environ 20) + Attestation (environ 15) + Signature (environ 30) + marge (10)
    const signatureSectionHeight = 75;
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerMargin = 20; // Espace pour le pied de page

    // Si pas assez de place, créer une nouvelle page
    if (y + signatureSectionHeight > pageHeight - footerMargin) {
      doc.addPage();
      y = 20;
    }

    // Rappels justificatifs
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Justificatifs à joindre :', 20, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (hasKmExpenses) {
      doc.text('• La carte grise du véhicule doit être jointe à la demande.', 25, y);
      y += 4;
    }
    if (hasOtherExpenses) {
      doc.text('• Les factures et justificatifs doivent être joints à la demande.', 25, y);
      y += 4;
    }

    y += 8;

    // Attestation sur l'honneur avec nom et prénom
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(30, 41, 59);
    const nomComplet = `${DOM.nom.value} ${DOM.prenom.value}`;
    doc.text(`Je soussigné(e) ${nomComplet} atteste sur l'honneur que les dépenses ci-dessus ont été réalisées dans le cadre de mes fonctions d'élu(e) du CSE.`, 20, y, { maxWidth: pageWidth - 40 });

    y += 15;

    // Signature de l'élu avec date de la demande
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fait le ${formatDate(DOM.dateDemande.value)}`, 20, y);

    y += 8;
    doc.text('Signature de l\'élu :', 20, y);

    y += 15;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, y, 100, y);

    // Pied de page
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text('CSE Younup - 7 mail Pablo Picasso, 44000 Nantes', 20, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    // Télécharger le PDF
    const fileName = `note_frais_CSE_${DOM.nom.value}_${DOM.prenom.value}_${DOM.dateDemande.value}.pdf`;
    doc.save(fileName);

    showToast('PDF généré avec succès !', 'success');
  };

  // Essayer de charger le logo puis générer le PDF
  logoImg.onload = () => {
    // Calculer les dimensions en mm (approximativement 1px = 0.264583mm)
    const pxToMm = 0.264583;
    const logoWidthMm = logoImg.naturalWidth * pxToMm;
    const logoHeightMm = logoImg.naturalHeight * pxToMm;
    generateContent(true, logoWidthMm, logoHeightMm);
  };
  logoImg.onerror = () => generateContent(false, 0, 0);

  // Timeout au cas où le logo prend trop de temps
  setTimeout(() => {
    if (!logoImg.complete) {
      generateContent(false, 0, 0);
    }
  }, 1000);
}

// ==========================================================================
// Utilitaires
// ==========================================================================

function formatCurrency(amount) {
  return amount.toFixed(2).replace('.', ',');
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR');
}

function showToast(message, type = 'info') {
  // Supprimer les toasts existants
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(t => t.remove());

  // Créer le nouveau toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Supprimer après 3 secondes
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function editExpense(id) {
  const expense = state.expenses.find(e => e.id === id);
  if (!expense) return;

  state.currentExpenseType = expense.type;

  if (expense.isKm) {
    openFraisKmModal(id);
  } else {
    openExpenseModal(expense.type, id);
  }
}

// Exposer les fonctions globalement pour les boutons onclick
window.deleteExpense = deleteExpense;
window.editExpense = editExpense;
window.loadRequest = loadRequest;
window.deleteRequest = deleteRequest;
