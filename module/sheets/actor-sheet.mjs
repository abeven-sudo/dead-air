import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DeadAirActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['dead-air', 'sheet', 'actor'],
      width: 900,
      height: 600,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'features',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/dead-air/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = context.data;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
    for (let [k, v] of Object.entries(context.system.abilities)) {
      v.label = game.i18n.localize(CONFIG.DEAD_AIR.abilities[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.spells = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on('click', '.rollable', this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
 
    const element = event.currentTarget;
    const dataset = element.dataset;

    console.log(dataset);

    function iterateattrib(num, value, stat) {
            for(let i = 1; i <= num; i++){
                var Element = document.getElementById(`${stat}-${i}`);

               if (i <= value) {
                    Element.dataset.state = "x";
                } else {
                    Element.dataset.state = "/";                 
                }
            }
     }

    // Get all the attribute values
        let attributereference = `this.actor.system.da_attributes`;
        let attributescore = eval(attributereference);

        let body = attributescore.body.value;
        let determination = attributescore.determination.value;
        let mind = attributescore.mind.value;
        let presence = attributescore.presence.value;
        let reaction = attributescore.reaction.value;

     // Update the screen DOM
        
        iterateattrib(6, body, "body");
        iterateattrib(6, determination, "determination");
        iterateattrib(6, mind, "mind");
        iterateattrib(6, presence, "presence");
        iterateattrib(6, reaction, "reaction");





 }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.testroll) {

        function iterateattrib(num, value, stat) {
            for(let i = 1; i <= num; i++){
                var Element = document.getElementById(`${stat}-${i}`);

               if (i <= value) {
                    Element.dataset.state = "x"; 
                } else {
                    Element.dataset.state = "/";                 
                }
            }
        }

     // Get what was clicked on
        let attribute = dataset.label;
        let index = dataset.index;

     // Update the attribute
        let actor = this.actor;

        actor.update({ [`system.da_attributes.${attribute}.value`]: `${index}` });

    // Get all the attribute values
        let attributereference = `this.actor.system.da_attributes`;
        let attributescore = eval(attributereference);

        let body = attributescore.body.value;
        let determination = attributescore.determination.value;
        let mind = attributescore.mind.value;
        let presence = attributescore.presence.value;
        let reaction = attributescore.reaction.value;

     // Update the screen DOM
        
        iterateattrib(6, body, "body");
        iterateattrib(6, determination, "determination");
        iterateattrib(6, mind, "mind");
        iterateattrib(6, presence, "presence");
        iterateattrib(6, reaction, "reaction");

    }

    // Dead Air Roller
    if (dataset.daroll) {

      // Detect a Dead Air roll from the attribute part of the sheet 

      let content = `<label for="numberdice">How many regular dice to roll:</label>
                     <input name="numberdice" type="number" value="1"></input>
                     <label for="numadvdice">How many advantage dice to roll:</label>
                     <input name="numadvdice" type="number" value="0"></input>
                     <label for="numdisdice">How many disadvantage dice to roll:</label>
                     <input name="numdisdice" type="number" value="0"></input>`;

      new Dialog({
          title: "Number of Dice to Roll",
          content,
          buttons: {
              roll: {
                  label: "Roll!",
                  callback: async (html) => {

                      let numstddice = parseInt(html.find("[name=numberdice]")[0].value);
                      let numdisdice = parseInt(html.find("[name=numdisdice]")[0].value);
                      let numadvdice = parseInt(html.find("[name=numadvdice]")[0].value);

                      // Roll the standard dice, 1s do not succeed
	
                        let stdroll = new Roll(`${numstddice}d6cs>=2`);
                        await stdroll.evaluate();


                      // Roll the advantage dice, 1s do not succeed, 1s do not fail

   		        let advroll = new Roll(`${numadvdice}d6cs>=2`);
                        await advroll.evaluate();
	

                      // Roll the disadvantage dice, 2s do not succeed

                        let disroll = new Roll(`${numdisdice}d6cs>=3`);
                        await disroll.evaluate();


                      // Get the attributes value from the actor
                      let attributereference = `this.actor.system.da_attributes.${dataset.llabel}.value`;
                      let attributescore = eval(attributereference);
 
                      // OL beaten is attribute value + number of successes
                      let OL = attributescore + stdroll.total + advroll.total + disroll.total;

                      // Don't count advantage dice here as they are allowed to fail
                      let success = "no";
                      if ( numstddice + numdisdice === stdroll.total + disroll.total ) {
                           success = "yes";
                      } else {
                           OL = 0;
                      }

                      // Build the output

                      let rolltt1 = await stdroll.getTooltip();
                      let rolltt2 = await advroll.getTooltip();
                      let rolltt3 = await disroll.getTooltip();

                      const template_file = "systems/dead-air/templates/dialogue/roll_output.html";
                      const rendered_html = await renderTemplate(template_file, {});

                      if (success === "yes") {
                          content = html;
	                  content = `<input class="bigcirclegreen" type="text" value="${OL}" data-dtype="Number">` + OL + "</p>" + "Standard Dice:<br>" + rolltt1 + "Advantage Dice:<br>" + rolltt2 + "Disadvantage Dice:<br>" + rolltt3;
                                             } else {
                          content = html;
	                  content = `<input class="bigcirclered">` + OL + "</p>" + "Standard Dice:<br>" + rolltt1 + "Advantage Dice:<br>" + rolltt2 + "Disadvantage Dice:<br>" + rolltt3;
	                                     }

                      ChatMessage.create({content: `${rendered_html}`});
              }
        }
    }
},
{
   width: 250
}).render(true)



    }

  }
}
