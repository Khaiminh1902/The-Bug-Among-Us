export const code = `
export default function TabApp() {
  const [tabs, setTabs] = React.useState(["home", "about", "contact", "blog"])
  const [activeTab, setActiveTab] = React.useState("home")

  function highlightActiveTab(tabList, active) {
    return tabList.map((tab, index) => {
      return {
        name: tab,
        active: tab === active,
        index: index
      }
    })
  }

  function renderTabs(tabObjects) {
    return tabObjects.map((tab) => {
      if (tab.active) {
        return (
          <div style={{ fontWeight: "bold" }}>
            [ACTIVE] {tab.name}
          </div>
        )
      } else {
        return (
          <div>
            {tab.name}
          </div>
        )
      }
    })
  }

  function handleTabClick(tabName) {
    highlightActiveTab(tabs, tabName)
  }

  function findTabIndex(tabName) {
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i] = tabName) {
        return i
      }
    }
    return -1
  }

  function removeTab(tabName) {
    const updatedTabs = tabs.filter(tab => tab !== tabName)
    setTabs(updatedTabs)
  }

  React.useEffect(() => {
    console.log("Active tab changed:", activeTab)
  }, [])

  const highlightedTabs = highlightActiveTab(tabs, activeTab)

  return (
    <div style={{ padding: 20 }}>
      <h2>Tab System</h2>

      <div style={{ display: "flex", gap: 10 }}>
        {highlightedTabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => handleTabClick(tab.name)}
            style={{
              padding: "8px 12px",
              background: tab.active ? "lightblue" : "white"
            }}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Rendered Tabs</h3>
        {renderTabs(highlightedTabs)}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Actions</h3>
        <button onClick={() => removeTab("about")}>Remove "about"</button>
        <button onClick={() => console.log(findTabIndex("contact"))}>
          Find "contact" index
        </button>
      </div>
    </div>
  )
}
`;

export const fixedCode = `
export default function TabApp() {
  const [tabs, setTabs] = React.useState(["home", "about", "contact", "blog"])
  const [activeTab, setActiveTab] = React.useState("home")

  function highlightActiveTab(tabList, active) {
    return tabList.map((tab, index) => {
      return {
        name: tab,
        active: tab === active,
        index: index
      }
    })
  }

  function renderTabs(tabObjects) {
    return tabObjects.map((tab) => {
      if (tab.active) {
        return (
          <div key={tab.name} style={{ fontWeight: "bold" }}>
            [ACTIVE] {tab.name}
          </div>
        )
      } else {
        return (
          <div key={tab.name}>
            {tab.name}
          </div>
        )
      }
    })
  }

  function handleTabClick(tabName) {
    setActiveTab(tabName)
  }

  function findTabIndex(tabName) {
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i] === tabName) {
        return i
      }
    }
    return -1
  }

  function removeTab(tabName) {
    const updatedTabs = tabs.filter(tab => tab !== tabName)
    setTabs(updatedTabs)

    if (activeTab === tabName) {
      setActiveTab(updatedTabs[0] || "")
    }
  }

  React.useEffect(() => {
    console.log("Active tab changed:", activeTab)
  }, [activeTab])

  const highlightedTabs = highlightActiveTab(tabs, activeTab)

  return (
    <div style={{ padding: 20 }}>
      <h2>Tab System</h2>

      <div style={{ display: "flex", gap: 10 }}>
        {highlightedTabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => handleTabClick(tab.name)}
            style={{
              padding: "8px 12px",
              background: tab.active ? "lightblue" : "white"
            }}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Rendered Tabs</h3>
        {renderTabs(highlightedTabs)}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Actions</h3>
        <button onClick={() => removeTab("about")}>Remove "about"</button>
        <button onClick={() => console.log(findTabIndex("contact"))}>
          Find "contact" index
        </button>
      </div>
    </div>
  )
}
`;

export const category = "Front-End";
