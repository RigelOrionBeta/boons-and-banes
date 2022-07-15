Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(BoonsAndBanes.ID);
    BoonsAndBanes.log(true, 'Boons and Banes Loaded!');
  });

class BoonsAndBanes {
    static ID = 'boons-and-banes';

    static log(force, ...args) {  
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
    
        if (shouldLog) {
          console.log(this.ID, '|', ...args);
        }
      }
    
    static FLAGS = {
      BNB: 'boonsandbanes'
    }
    
    static TEMPLATES = {
      BOONSANDBANES: `modules/${this.ID}/templates/boons-and-banes.hbs`
    }
    
    static SETTINGS = {
      INJECT_BUTTON: 'inject-button'
    }

    static initialize() {
      this.boonsAndBanesConfig = new BoonsAndBanesConfig();
      game.settings.register(this.ID, this.SETTINGS.INJECT_BUTTON, {
        name: `BOONS-AND-BANES.settings.${this.SETTINGS.INJECT_BUTTON}.Name`,
        default: true,
        type: Boolean,
        scope: 'client',
        config: true,
        hint: `BOONS-AND-BANES.settings.${this.SETTINGS.INJECT_BUTTON}.Hint`,
        onChange: () => ui.players.render()
      });
    }
  }

class BoonsAndBanesData {
    static getForUser(userId) {
        return game.users.get(userId)?.getFlag(BoonsAndBanes.ID, BoonsAndBanes.FLAGS.BNB);
    }

    static create(userId, boonsAndBanesData) {
        // generate a random id for this new ToDo and populate the userId
        const newBoonAndBane = {
            active: false,
            id: foundry.utils.randomID(16),
            userId,
            duration: 0,
            effect: "",
            icon: "",
            suspended: false,
            endCondition: 'Passive',
            endsAt: 'Beginning',
            endsWith: 'Source',
            value: "0",
            ...boonsAndBanesData,
        }

        // construct the update to insert the new ToDo
        const newBoonsAndBanes = {
            [newBoonAndBane.id]: newBoonAndBane
        }

        // update the database with the new ToDos
        return game.users.get(userId)?.setFlag(BoonsAndBanes.ID, BoonsAndBanes.FLAGS.BNB, newBoonsAndBanes);
    }

    // canvas.tokens.ownedTokens[1].data.actorData.effects[0]

    static get getAll() {
        const allBoonsAndBanes = game.users.reduce((accumulator, user) => {
          const userBoonsAndBanes = this.getForUser(user.id);
    
          return {
            ...accumulator,
            ...userBoonsAndBanes
          }
        }, {});
    
        return allBoonsAndBanes;
    }

    static update(boonsAndBanesId, updateData) {
        const relevantBoonsAndBanes = this.getAll[boonsAndBanesId];
    
        // construct the update to send
        const newData = {
          [boonsAndBanesId]: updateData
        }
    
        // update the database with the updated ToDo list
        return game.users.get(relevantBoonsAndBanes.userId)?.setFlag(BoonsAndBanes.ID, BoonsAndBanes.FLAGS.BNB, newData);
    }

    static updateAllForUser(userId, updateData) {
        return game.users.get(userId)?.setFlag(BoonsAndBanes.ID, BoonsAndBanes.FLAGS.BNB, updateData);
    }

    static delete(boonsAndBanesId) {
        const relevantBoonsAndBanes = this.getAll[boonsAndBanesId];
    
        // Foundry specific syntax required to delete a key from a persisted object in the database
        const keyDeletion = {
          [`-=${boonsAndBanesId}`]: null
        }
    
        // update the database with the updated ToDo list
        return game.users.get(relevantBoonsAndBanes.userId)?.setFlag(BoonsAndBanes.ID, BoonsAndBanes.FLAGS.BNB, keyDeletion);
    }
}

// Boons and Banes configuration window
// https://foundryvtt.wiki/en/development/guides/understanding-form-applications
class BoonsAndBanesConfig extends FormApplication {
  static get defaultOptions() {
    const defaults = super.defaultOptions;
  
    const overrides = {
      height: 'auto',
      id: 'boons-and-banes',
      template: BoonsAndBanes.TEMPLATES.BOONSANDBANES,
      title: 'Boons And Banes List',
      userId: game.userId,
      closeOnSubmit: false, // do not close when submitted
      submitOnChange: true, // submit when any input changes
      submitOnClose: true, // Save changes on closing of window
    };
  
    const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
    
    return mergedOptions;
  }

  // Update the object with the data the user has entered into the form
  async _updateObject(event, formData) {
    const expandedData = foundry.utils.expandObject(formData);
    BoonsAndBanes.log(true, "Update: ", expandedData);
    await BoonsAndBanesData.updateAllForUser(this.options.userId, expandedData);
    this.render();
  }

  // Get data for the logged in user.
  getData(options) {
    return {
      boonsnbanes: BoonsAndBanesData.getForUser(options.userId)
    }
  }

  // Handle when the user clicks
  activateListeners(html) {
    super.activateListeners(html);

    //https://api.jquery.com/click/
    html.on('click', "[data-action]", this._handleClick.bind(this));
  }

  // Handle certain clicks here.
  async _handleClick(event) {

    // Certain elements have 'actions' associated with them (defined in hbs file)
    const clickedElement = $(event.currentTarget);
    const action = clickedElement.data().action;

    // Get the id from the specific boon or bane associated with the button clicked
    const boonsAndBanesId = clickedElement.parents('[data-boons-and-banes-id]')?.data()?.boonsAndBanesId;

    BoonsAndBanes.log(false, 'Button Clicked!', {action, boonsAndBanesId});

    // handle what happens when the buttons in config window are clicked
    switch (action) {
      // Add Effect button
      case 'create': {
        await BoonsAndBanesData.create(this.options.userId);
        this.render();
        break;
      }
      // Trash can button
      case 'delete': {
        const confirmed = await Dialog.confirm({
          title: game.i18n.localize("BOONS-AND-BANES.confirms.deleteConfirm.Title"),
          content: game.i18n.localize("BOONS-AND-BANES.confirms.deleteConfirm.Content")
        });

        if (confirmed) {
          await BoonsAndBanesData.delete(boonsAndBanesId);
          this.render();
        }

        break;
      }
      default:
        BoonsAndBanes.log(false, 'Invalid action detected', action);
    }
  }
}

// Display the boons and banes button
Hooks.on('renderPlayerList', (playerList, html) => {

  // If disabled in settings, disable module button
  if (!game.settings.get(BoonsAndBanes.ID, BoonsAndBanes.SETTINGS.INJECT_BUTTON)) {
    return;
  }

  // find the element which has our logged in user's id
  const loggedInUserListItem = html.find(`[data-user-id="${game.userId}"]`)

  // create localized tooltip
  const tooltip = game.i18n.localize('BOONS-AND-BANES.button-title');

  // insert a button at the end of this element
  loggedInUserListItem.append(
    `<button type='button' class='boons-and-banes-icon-button flex0' title='${tooltip}'><i class='fas fa-tasks'></i></button>`
  );

  // Whent he boons and banes button is clicked
  // https://api.jquery.com/click/
  html.on('click', '.boons-and-banes-icon-button', (event) => {
    BoonsAndBanes.log(true, 'Opening Boons And Banes Config');
    const userId = $(event.currentTarget).parents('[data-user-id]')?.data()?.userId;
    BoonsAndBanes.boonsAndBanesConfig.render(true, {userId});
  });
});

Hooks.once('init', () => {
  BoonsAndBanes.initialize();
});

// Log simple statement
// BoonsAndBanes.log(true, 'Boons and Banes Loaded!');

// Create a boon and assign to user
// BoonsAndBanesData.create(game.userId, {label: 'Bless'});

// See all boons for each user
// BoonsAndBanesData.getAll

// Update specific boon by boon ID
// BoonsAndBanesData.update("uKDFz87qGrDFvGVu", {label: 'Aid'})
// BoonsAndBanesData.update("uKDFz87qGrDFvGVu", {label: 'Aid', isDone: true})

// Detele specific boon
// BoonsAndBanesData.delete("boonsAndBanesId")

