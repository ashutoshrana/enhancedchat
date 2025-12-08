import { LightningElement, track } from 'lwc';
import {
  dispatchMessagingEvent,
  assignMessagingEventHandler,
  MESSAGING_EVENT
} from 'lightningsnapin/eventStore';

export default class CapellaMessagingHeader extends LightningElement {
  @track showMenu = false;

  // Handle menu button click
  handleMenuClick() {
    this.showMenu = !this.showMenu;
  }

  // Handle minimize button click
  handleMinimize() {
    // Dispatch minimize event to Salesforce
    dispatchMessagingEvent({
      eventType: MESSAGING_EVENT.MINIMIZE_CONVERSATION
    });
    this.showMenu = false;
  }

  // Handle close button click
  handleClose() {
    // Dispatch close event to Salesforce
    dispatchMessagingEvent({
      eventType: MESSAGING_EVENT.CLOSE_CONVERSATION
    });
    this.showMenu = false;
  }

  // Handle end conversation menu item
  handleEndConversation() {
    // Dispatch end conversation event
    dispatchMessagingEvent({
      eventType: MESSAGING_EVENT.END_CONVERSATION
    });
    this.showMenu = false;
  }

  // Listen for messaging events
  connectedCallback() {
    // Handle conversation updates
    assignMessagingEventHandler({
      eventType: MESSAGING_EVENT.CONVERSATION_UPDATED,
      handler: (event) => {
        console.log('Conversation updated:', event);
        // Add custom logic here if needed
      }
    });

    // Handle participant joined
    assignMessagingEventHandler({
      eventType: MESSAGING_EVENT.PARTICIPANT_JOINED,
      handler: (event) => {
        console.log('Participant joined:', event);
        // Add custom logic here if needed
      }
    });
  }
}
