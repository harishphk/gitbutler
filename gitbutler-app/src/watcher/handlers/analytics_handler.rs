use anyhow::{Context, Result};
use tauri::{AppHandle, Manager};

use crate::{analytics, users};

use super::events;

#[derive(Clone)]
pub struct Handler {
    users: users::Controller,
    client: analytics::Client,
}

impl From<&AppHandle> for Handler {
    fn from(value: &AppHandle) -> Self {
        Self {
            client: value.state::<analytics::Client>().inner().clone(),
            users: users::Controller::from(value),
        }
    }
}

impl Handler {
    pub async fn handle(&self, event: &analytics::Event) -> Result<Vec<events::Event>> {
        if let Some(user) = self.users.get_user().context("failed to get user")? {
            self.client.send(&user, event).await;
        }
        Ok(vec![])
    }
}