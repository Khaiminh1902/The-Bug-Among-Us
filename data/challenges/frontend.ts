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

  // 🔴 DEBUG HERE (Bug 1)
  // Missing "key" prop when rendering lists
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

  // 🔴 DEBUG HERE (Bug 2)
  // State is not being updated when clicking a tab
  function handleTabClick(tabName) {
    highlightActiveTab(tabs, tabName)
  }

  // 🔴 DEBUG HERE (Bug 3)
  // Assignment instead of comparison
  function findTabIndex(tabName) {
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i] = tabName) {
        return i
      }
    }
    return -1
  }

  // 🔴 DEBUG HERE (Bug 4)
  // Removing a tab should also handle activeTab correctly
  function removeTab(tabName) {
    const updatedTabs = tabs.filter(tab => tab !== tabName)
    setTabs(updatedTabs)
  }

  // 🔴 DEBUG HERE (Bug 5)
  // useEffect missing dependency
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

export const category = "Front-End";
