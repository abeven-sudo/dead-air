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

    // Update dots
    html.on('click', '.clickable', this._onClick.bind(this));

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

    // Iterate over the row of dots passed in
    function iteratedots(value, max, stat) {
        for(let i = 0; i <= value-1; i++){
                var Element = document.getElementById(`${stat}-${i}`);

               if (i <= max-1) {
                    Element.dataset.state = "x";
                } else {
                    Element.dataset.state = "/";
                }
            }
     }

     // Firstly update the attributes
      let attributereference = `this.actor.system.attributes`;
      let attributearray = eval(attributereference);

      let key = 0;
      for (key in attributearray) {
          let currentrecord = attributearray[key];
          iteratedots(currentrecord.value, currentrecord.max, currentrecord.label);
      }

     // Then update preperation
      let preparationreference = `this.actor.system.preparation`;
      let preparationarray = eval(preparationreference);

      key = 0;
      for (key in preparationarray) {
          let currentrecord = preparationarray[key];
          iteratedots(currentrecord.value, currentrecord.max, currentrecord.label);
      }

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
  _onClick(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

      // Get what was clicked on
        let label = dataset.label;
        let index = Number(dataset.index) + 1;

     // Update the attribute
        let actor = this.actor;

        actor.update({ [`${label}.value`]: `${index}` });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
   async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

// Functions we need in here


async function diceroller(checkObj) {
  // Finally roll the dice!

  async function diceroller(numdice, target) {
    const pattern = "<ol(.|\n)*?(?=/ol>)";
    let roll = new Roll(`${numdice}d6cs>${target}`);
    await roll.evaluate();
    let successes = roll.total;
    let rolltt = await roll.getTooltip();
    let array_matches = rolltt.match(pattern);
    let rolloutput = (array_matches.at(0) + "/ol>");
    return [successes, rolloutput];
  }

  // Dice Rolling Logic
  checkObj.successes = Number(checkObj.basesuccesses);

  // If required, Roll the standard dice, 1s do not succeed
  if ( checkObj.standarddice > 0 ) {
    checkObj.standardroll = await diceroller(checkObj.standarddice, 1);

    console.log(checkObj);
    checkObj.successes = checkObj.successes + checkObj.standardroll[0];
  }

  // If required, Roll the advantage dice, 1s do not succeed, 1s do not fail
  if ( Number(checkObj.advantagedice) > 0 ) {
    checkObj.advantageroll = await diceroller(checkObj.advantagedice, 1);
    checkObj.successes = checkObj.successes + checkObj.advantageroll[0];
  }

  // If required, Roll the disadvantage dice, 2s do not succeed
  if ( Number(checkObj.disadvantagedice) > 0 ) {
    checkObj.disadvantageroll = await diceroller(checkObj.disadvantagedice, 2);
    checkObj.successes = checkObj.successes + checkObj.disadvantageroll[0];
  }

  return checkObj;

}

function calculatedicetoroll(html, actor, checkObj) {
  // Read required results from HTML
  let outcome = parseInt(html.find("[name=outcome]")[0].value);
  let OL = $("input:radio[name=OL]:checked").val();
  let usedsoma = parseInt(html.find("[name=soma]")[0].value);
  let advdice = parseInt(html.find("[name=advdice]")[0].value);
  let disdice = parseInt(html.find("[name=disdice]")[0].value);
  let netadvdisdice = ( advdice - disdice );

  // Record base OL
  checkObj.baseOL = Number(OL);

  // Increase the OL based on the success being looked for
  checkObj.modifiedOL = Number(OL) + Number(outcome);

  // Save the outcome number for later
  checkObj.outcomenumber = Number(outcome);

  if ( outcome === 0 ) {
    checkObj.outcome = "Outcome with a cost";
  }
  if ( outcome === 1 ) {
    checkObj.outcome = "Standard outcome";
  }
  if ( outcome === 2 ) {
    checkObj.outcome = "Outcome with an increment";
  }

  // Increase base successes with Soma usage and reduce Soma
  if ( usedsoma > 0 ) {
    // Read value of rolled attribute
    let currentsoma = Number(actor.system.trackedresources.soma.value);
    checkObj.basesuccesses = Number(checkObj.basesuccesses) + usedsoma;
    checkObj.usedsoma = usedsoma;
    let newsoma = currentsoma - usedsoma;

    actor.update({ [`system.trackedresources.soma.value`]: newsoma });
  }

  // Work out advantage or disadvantage dice, only do this after the first click
  if ( netadvdisdice > 0 ) {
    checkObj.advantagedice = netadvdisdice;
    checkObj.disadvantagedice = 0;
  } else {
    if ( netadvdisdice < 0 ) {
      checkObj.disadvantagedice = netadvdisdice * -1;
      checkObj.advantagedice = 0;
    }
  }

  // We can now clear the advantage and disadvantage dice
  actor.update({ [`system.trackedresources.advantagedice`]: "0" });
  actor.update({ [`system.trackedresources.disadvantagedice`]: "0" });

  // Work out how many standard dice
  checkObj.standarddice = Math.max(0, checkObj.modifiedOL - checkObj.basesuccesses);

  if ( checkObj.advantagedice > 0 ) {
    checkObj.standarddice = Math.max(0, checkObj.modifiedOL - checkObj.advantagedice - checkObj.basesuccesses);
  }
  if ( checkObj.disadvantagedice > 0 ) {
    checkObj.standarddice = Math.max(0, checkObj.modifiedOL - checkObj.disadvantagedice - checkObj.basesuccesses);
  }

  return checkObj;

}

  async function calloutput(checkObj) {
  // Render template not formatting HTML correctly, so this approach is used
     let standarddiceoutput = "";
     let advantagediceoutput = "";
     let disadvantagediceoutput = "";

  // At this point check roll success or failure. If any 1s on Standard or 1-2s on disadvantage dice
     checkObj.checkresult = checkObj.outcome;

  // Set up dice strings
     if (typeof checkObj.standardroll !== "undefined") {
         standarddiceoutput = "<h3>Standard Dice</h3>" + checkObj.standardroll[1];
  // At this point check roll success or failure. If any 1s on Standard or 1-2s on disadvantage dice
         if ( Number(checkObj.standardroll[0]) < Number(checkObj.standarddice) ) {
             checkObj.outcome = "Check failed!";
             checkObj.successes = 0;
         }
     }

     if (typeof checkObj.advantageroll !== "undefined") {
         advantagediceoutput = "<h3>Advantage Dice</h3>" + checkObj.advantageroll[1];
     }

     if (typeof checkObj.disadvantageroll !== "undefined") {
         disadvantagediceoutput = "<h3>Disadvantage Dice</h3>" + checkObj.disadvantageroll[1];
  // At this point check roll success or failure. If any 1s on Standard or 1-2s on disadvantage dice
         if ( Number(checkObj.disadvantageroll[0]) < Number(checkObj.disadvantagedice) ) {
             checkObj.outcome = "Check failed!";
             checkObj.successes = 0;
         }  
     }

  // Failed advantage dice could reduce the outcome to a failed state or lower state of success
     if (typeof checkObj.advantageroll !== "undefined") {
       let reduction = Number(checkObj.advantagedice) - Number(checkObj.advantageroll[0]);

      if ( reduction > 0 ) {
         let reductionstep = checkObj.outcomenumber - reduction;
           if ( Number(reductionstep) < 0 ) {
             checkObj.outcome = "Check failed!";
           }
           if ( Number(reductionstep) === 0 ) {
             checkObj.outcome = "Outcome with a cost";
           }
           if ( Number(reductionstep) === 1 ) {
             checkObj.outcome = "Standard outcome";
           }
       }
     }

    let content = `<div class="grid grid-2col">
                       <div>
                           <p>Target OL</p>
                           <p class="bigcirclegreen flex-group-center">${checkObj.modifiedOL}</p>
                       </div>
                       <div>
                           <p>Rolled Successes</p>
                           <p class="bigcirclegreen flex-group-center">${checkObj.successes}</p>
                       </div>
                    </div>
                    <div>
                        <h3>Result</h3>
                        <p>${checkObj.outcome}</p>
                    </div>
                    <div class="dice-tooltip">
                        <section class="tooltip-part">
                            <div class="dice">
                                ${standarddiceoutput}
                                ${advantagediceoutput}
                                ${disadvantagediceoutput}
  	                    </div>
                         </section>
                     </div>`;

    ChatMessage.create({content: `${content}`});

  }


    // Dead Air Roller
    if (dataset.roll) {

      // Dicerolling function part 1
      // Detect a Dead Air roll from the attribute part of the sheet 
      // Get the attributes type and value from the actor
      // Read value of rolled attribute

      // Make actor convienient
      let actor = this.actor;

      let checkObj = {
        attributevalue: eval(`this.actor.${dataset.label}.value`),
        attributelabel: eval(`this.actor.${dataset.label}.label`),
        attributestring: dataset.label,
        basesuccesses: eval(`this.actor.${dataset.label}.value`),
        usedsoma: 0,
        outcomenumber: 0,
        outcome: "",
        checkresult: "",
        baseOL: 0,
        modifiedOL: 0,
        successes: 0,
        standarddice: 0,
        advantagedice: this.actor.system.trackedresources.advantagedice,
        disadvantagedice: this.actor.system.trackedresources.disadvantagedice
      };

      let data = { attributeslabel: checkObj.attributelabel,
                   attributescore: checkObj.attributevalue,
                   advantagedice: checkObj.advantagedice,
                   disadvantagedice: checkObj.disadvantagedice
                 };

      let content = await renderTemplate("systems/dead-air/templates/dialogue/rd.html", data);
    
      new Dialog({
          title: "Position or Defence Check",
          content,
          buttons: {
              roll: {
                  label: "Roll!",
                  callback: async (html) => {
		    // Handle responses and do all of the calculations to generate the three possible roll pools
                    let dicecalc = calculatedicetoroll(html, this.actor, checkObj);
                    // Retrieve values from the return array
                    console.log("Dice Calc");
                    console.log(dicecalc);

                    checkObj = dicecalc;

                    data =        { basesuccesses: checkObj.basesuccesses,
                                    standarddice: checkObj.standarddice,
                                    advdice: checkObj.advantagedice,
                                    disdice: checkObj.disadvantagedice
                                  };

                    let content = await renderTemplate("systems/dead-air/templates/dialogue/ro.html", data);

                    new Dialog({
                      title: "Box 2",
                       content,
                         buttons: {
                           roll: {
                             label: "Roll!",
                               callback: async (html) => {
                                 // Roll the dice and get the responses
                                 let rolloutputs = await diceroller(checkObj);
                                 checkObj = rolloutputs;

                                 console.log(checkObj);

                                // Call the output
                                let output = calloutput(checkObj);
                              }
                            }
                          }
                     },
                    { width: 450 }).render(true);

                  }
              }
          }
      },
      { width: 450 }).render(true);
    }
  }
}
