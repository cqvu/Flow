import React from 'react';
import { IoMdAddCircle } from 'react-icons/io';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { v4 as uuid } from 'uuid';
import TabGroup from './TabGroup';
import Tab from './Tab';
import '../styles/Menu.css';

class Menu extends React.Component {
  constructor() {
    super();

    this.state = {
      addGroupModal: false,
      activeTabs: [],
      tabGroups: [],
      savedTabs: [],
    };
  }

  componentDidMount() {
    this.getActiveTabs();
    this.getTabGroups();
    this.getSavedTabs();
  }

  getActiveTabs = () => {
    chrome.tabs.query({}, (tabs) => {
      const activeTabs = [];

      for (let i = 0; i < tabs.length; i += 1) {
        let addable = true;
        for (let j = 0; j < activeTabs.length; j += 1) {
          if (tabs[i].url === activeTabs[j].url) {
            addable = false;
          }
        }
        if (addable) {
          activeTabs.push({
            title: tabs[i].title,
            url: tabs[i].url,
            // key: tabs[i].key,
          });
        }
      }
      this.setState({ activeTabs });
    });
  };

  getTabGroups = () => {
    chrome.storage.sync.get('tabGroups', (obj) => {
      let { tabGroups } = obj;
      if (!tabGroups) {
        chrome.storage.sync.set({ tabGroups: [] });
        tabGroups = [];
      }
      this.setState({ tabGroups });
    });
  };

  getSavedTabs = () => {
    chrome.storage.sync.get('savedTabs', (obj) => {
      let { savedTabs } = obj;
      if (!savedTabs || savedTabs.length === 0) {
        savedTabs = [];
      }
      this.setState({ savedTabs });
    });
  };

  deleteSavedTabs = () => {
    const savedTabs = [];
    this.setState({ savedTabs });
    chrome.storage.sync.set({ savedTabs });
  };

  openSavedTabs = () => {
    const { savedTabs } = this.state;
    savedTabs.forEach((tabUrl) => {
      chrome.tabs.create({ url: tabUrl.url });
    });
    this.deleteSavedTabs();
  };

  drop = (e) => {
    const { tabGroups } = this.state;
    const droppable = e.target.attributes.getNamedItem('droppable').value;
    if (droppable !== 'true' || e.target === undefined) {
      e.preventDefault();
      e.dataTransfer.effectAllowed = 'none';
      e.dataTransfer.dropEffect = 'none';
    } else {
      e.preventDefault();
      const tabObj = JSON.parse(e.dataTransfer.getData('text'));
      // get the element by the id
      const tab = document.getElementById(tabObj.id);

      const index = tabGroups.findIndex(
        (tabGroup) => tabGroup.name === e.target.id
      );

      const tabData = {
        title: tabObj.title,
        url: tabObj.url,
        favIconUrl: tabObj.favIconUrl,
      };
      let addable = true;
      for (let i = 0; i < tabGroups[index].tabs.length; i += 1) {
        if (tabGroups[index].tabs[i].url === tabObj.url) {
          addable = false;
        }
      }
      if (addable === true) {
        tabGroups[index].tabs.push(tabData);
        tab.style.display = 'block';
        e.target.appendChild(tab);
      }
      chrome.storage.sync.set({ tabGroups });
    }
  };

  dragOver = (e) => {
    e.preventDefault();
  };

  addGroup = (e) => {
    if (e.type === 'submit') {
      e.preventDefault();
      const { activeTabs, tabGroups } = this.state;
      let groupName = e.target[0].value;
      if (groupName === '') {
        groupName = 'Untitled';
      }
      const { options } = e.target[1];

      const selectedTabs = [];
      for (let i = 0, l = options.length; i < l; i += 1) {
        if (options[i].selected) {
          selectedTabs.push(activeTabs[i]);
        }
      }
      let count = 0;
      let nameCheck = true;
      let tempGroupName = groupName;
      while (nameCheck) {
        const index = tabGroups.findIndex(
          (tabGroup) => tabGroup.name === tempGroupName
        );
        if (index === -1) {
          nameCheck = false;
        } else {
          count += 1;
          tempGroupName = groupName + count.toString();
        }
      }
      groupName = tempGroupName;

      const newGroup = {
        name: groupName,
        trackid: uuid(),
        tabs: selectedTabs,
      };

      tabGroups.push(newGroup);
      this.setState({ tabGroups });
      chrome.storage.sync.set({ tabGroups }, () => {});

      this.modalClose();
    }
  };

  deleteGroup = (target) => {
    let { tabGroups } = this.state;
    tabGroups = tabGroups.filter((tabGroup) => tabGroup.trackid !== target);
    this.setState({ tabGroups });
    chrome.storage.sync.set({ tabGroups });
  };

  editGroup = (target, newName) => {
    const { tabGroups } = this.state;
    const index = tabGroups.findIndex(
      (tabGroup) => tabGroup.trackid === target
    );
    let count = 0;
    if (tabGroups[index].name === newName) {
      // eslint-disable-next-line no-param-reassign
      newName = tabGroups[index].name;
    } else {
      let tempName = newName;
      while (true) {
        const i = tabGroups.findIndex((tabGroup) => tabGroup.name === tempName);
        if (i === -1 || i === index) {
          break;
        } else {
          count += 1;
          tempName = newName + count.toString();
        }
      }
      // eslint-disable-next-line no-param-reassign
      newName = tempName;
    }
    tabGroups[index].name = newName;
    this.setState({ tabGroups });
    chrome.storage.sync.set({ tabGroups });
  };

  modalClose = () => {
    this.setState({ addGroupModal: false });
  };

  render() {
    const { addGroupModal, activeTabs, tabGroups, savedTabs } = this.state;
    return (
      <div className="container-fluid maxHeight">
        <div className="row maxHeight">
          <div className="col-2 leftSideBar maxHeight">
            <div className="activeTabsContainer">
              <div className="activeTabsHeader">
                <h2>Active Tabs</h2>
              </div>
              <div
                id="activeTabs"
                className="activeTabs"
                droppable="true"
                onDrop={this.drop}
                onDragOver={this.dragOver}
              >
                {activeTabs.map((tab) => (
                  <Tab
                    title={tab.title}
                    url={tab.url}
                    favIconUrl={tab.favIconUrl}
                  />
                ))}
              </div>
            </div>
            {savedTabs.length !== 0 ? (
              <div className="savedTabsContainer">
                <div className="savedTabsHeader">
                  <h2>Saved Tabs</h2>
                  <button type="button" onClick={this.deleteSavedTabs}>
                    Delete All
                  </button>
                  <button type="button" onClick={this.openSavedTabs}>
                    Open All
                  </button>
                </div>
                <div className="savedTabs">
                  {savedTabs.map((tab) => (
                    <Tab
                      title={tab.title}
                      url={tab.url}
                      favIconUrl={tab.favIconUrl}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="col-10 content maxHeight">
            <div className="tabGroupsContainer">
              <div className="tabGroupsHeader">
                <h2>Tab Groups</h2>
              </div>
              <div className="tabGroups">
                {tabGroups.map((tabGroup) => (
                  <TabGroup
                    view="menu"
                    key={tabGroup.trackid}
                    trackid={tabGroup.trackid}
                    name={tabGroup.name}
                    tabs={tabGroup.tabs}
                    deleteGroup={this.deleteGroup}
                    editGroup={this.editGroup}
                    drop={this.drop}
                    dragOver={this.dragOver}
                  />
                ))}
              </div>
            </div>
            <button
              className="addGroup"
              type="button"
              onClick={() => {
                this.setState({ addGroupModal: true });
              }}
              data-testid="add-button"
            >
              <IoMdAddCircle />
            </button>
          </div>
        </div>

        <Modal show={addGroupModal} onHide={this.modalClose} animation={false}>
          <Modal.Header closeButton>
            <Modal.Title>Create a New tabGroup</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={this.addGroup} data-testid="form">
              <Form.Group controlId="groupName">
                <Form.Label>Group Name</Form.Label>
                <Form.Control type="text" placeholder="Enter Group Name..." />
              </Form.Group>
              <Form.Group controlId="selectedTabs">
                <Form.Label>Add Tabs to tabGroup</Form.Label>
                <Form.Control as="select" multiple>
                  {activeTabs.map((tab) => (
                    <option key={uuid()}>{tab.title}</option>
                  ))}
                </Form.Control>
              </Form.Group>
              <Button variant="primary" type="submit" onClick={this.addGroup}>
                Create Group
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

export default Menu;
