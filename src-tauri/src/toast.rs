use windows::{
    core::{Result, HSTRING},
    Data::Xml::Dom::XmlDocument,
    UI::Notifications::{ToastNotification, ToastNotificationManager},
};

use crate::windows_app::is_packaged;

// Unpackaged builds (dev, MSI) have no app identity of their own, so their toasts borrow PowerShell's.
const POWERSHELL_APP_ID: &str = r"{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe";

/// Shows a Windows toast. `title` and `body` go into XML unescaped, so they must not contain `&` or `<`.
pub fn show(title: &str, body: &str) -> Result<()> {
    let xml = XmlDocument::new()?;
    xml.LoadXml(&HSTRING::from(format!(
        r#"<toast><visual><binding template="ToastGeneric"><text>{title}</text><text>{body}</text></binding></visual></toast>"#
    )))?;
    let toast = ToastNotification::CreateToastNotification(&xml)?;

    // Packaged apps must use the package's own ID; any other ID is rejected inside an MSIX.
    let notifier = if is_packaged() {
        ToastNotificationManager::CreateToastNotifier()?
    } else {
        ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(POWERSHELL_APP_ID))?
    };
    notifier.Show(&toast)
}
